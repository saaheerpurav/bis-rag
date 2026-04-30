"""
FastAPI application — BIS Compliance Co-pilot backend.

Routes:
    POST /query          — Main RAG query endpoint
    POST /voice          — Audio file → transcribe → query
    GET  /standard/{id}  — Get standard detail by normalized code
    GET  /graph          — Full knowledge graph JSON
    GET  /pdf/{page}     — Serve PDF page image
    POST /whatsapp/webhook — Twilio WhatsApp webhook
    GET  /health         — Health check
"""
import json
import base64
import tempfile
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import REGISTRY_PATH, GRAPH_PATH, DATASET_PDF, OPENAI_API_KEY
from src.api.schemas import QueryRequest, QueryResponse

# Global pipeline instance
pipeline = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline
    print("Loading RAG pipeline...")
    from src.pipeline import RAGPipeline
    pipeline = RAGPipeline.load(generate_rationale=True, generate_roadmap=True)
    print("Pipeline ready.")
    yield
    print("Shutting down.")


app = FastAPI(
    title="BIS Compliance Co-pilot",
    description="AI-powered BIS Standards Recommendation Engine for Indian MSEs",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include WhatsApp router
from src.api.whatsapp import router as whatsapp_router
app.include_router(whatsapp_router)


@app.get("/health")
async def health():
    return {"status": "ok", "pipeline_ready": pipeline is not None}


@app.post("/query")
async def query_endpoint(req: QueryRequest):
    if pipeline is None:
        raise HTTPException(503, "Pipeline not ready")
    result = pipeline.query(
        req.query,
        top_n=req.top_n,
        include_rationale=req.include_rationale,
        include_roadmap=req.include_roadmap,
        language=req.language,
    )
    return result


@app.post("/voice")
async def voice_endpoint(
    file: UploadFile = File(...),
    language: str = Query(default="en"),
):
    """Transcribe audio file via Whisper, then run RAG query."""
    if not OPENAI_API_KEY:
        raise HTTPException(400, "OpenAI API key required for voice transcription")
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)

    content = await file.read()
    suffix = Path(file.filename).suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    with open(tmp_path, "rb") as audio:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio,
            language="hi" if language == "hi" else "en",
        )
    query_text = transcript.text

    if pipeline is None:
        raise HTTPException(503, "Pipeline not ready")

    result = pipeline.query(
        query_text,
        top_n=5,
        include_rationale=True,
        language=language,
    )
    result["transcribed_query"] = query_text
    return result


@app.get("/standard/{code}")
async def get_standard(code: str):
    """Get full standard details by normalized IS code."""
    with open(REGISTRY_PATH, encoding="utf-8") as f:
        registry = json.load(f)
    # Try exact match first
    if code in registry:
        return registry[code]
    # Fuzzy: search by is_code number
    import re
    num = re.sub(r"[^\d]", "", code)
    for norm, std in registry.items():
        if re.sub(r"[^\d]", "", std["is_code"]) == num:
            return std
    raise HTTPException(404, f"Standard '{code}' not found")


@app.get("/standards")
async def list_standards(
    section: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 100,
):
    """List all standards, optionally filtered."""
    with open(REGISTRY_PATH, encoding="utf-8") as f:
        registry = json.load(f)
    standards = list(registry.values())
    if section is not None:
        standards = [s for s in standards if s["section"] == section]
    if search:
        sq = search.lower()
        standards = [s for s in standards if sq in s["title"].lower() or sq in s.get("scope", "").lower()]
    return {"total": len(standards), "standards": standards[:limit]}


@app.get("/graph")
async def get_graph():
    """Return the full standards knowledge graph."""
    with open(GRAPH_PATH, encoding="utf-8") as f:
        return json.load(f)


@app.get("/graph/neighbors/{is_code}")
async def get_neighbors(is_code: str, depth: int = 1):
    """Return neighborhood of a standard in the graph."""
    with open(GRAPH_PATH, encoding="utf-8") as f:
        graph = json.load(f)

    # Build adjacency
    adj = {}
    for edge in graph["edges"]:
        adj.setdefault(edge["source"], []).append(edge["target"])
        adj.setdefault(edge["target"], []).append(edge["source"])

    visited = {is_code}
    frontier = [is_code]
    for _ in range(depth):
        next_frontier = []
        for node in frontier:
            for neighbor in adj.get(node, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_frontier.append(neighbor)
        frontier = next_frontier

    nodes = [n for n in graph["nodes"] if n["id"] in visited]
    edges = [e for e in graph["edges"] if e["source"] in visited and e["target"] in visited]
    return {"nodes": nodes, "edges": edges}
