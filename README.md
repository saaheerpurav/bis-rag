# BIS Compliance Co-pilot

**AI-powered BIS Standards Recommendation Engine for Indian MSEs**

> Hackathon submission — BIS × SS Hackathon · Theme: Accelerating MSE Compliance · May 2026

---

## Evaluation Results (Public Test Set)

| Metric | Score | Target |
|---|---|---|
| Hit Rate @3 | **100%** | >80% |
| MRR @5 | **0.90** | >0.7 |
| Avg Latency | **0.28s** | <5s |

---

## Judge Setup (3 steps, ~2 minutes)

### Step 1 — Install dependencies
```bash
pip install -r requirements.txt
```

> **No API key required.** The inference pipeline runs fully locally using a 23MB ONNX model that downloads automatically on first run.

### Step 2 — Run inference
```bash
python inference.py --input data/public_test_set.json --output results.json
```

### Step 3 — Score results
```bash
python eval_script.py --results results.json
```

That's it. Pre-built indexes are included in the repository (`data/processed/`). No need to run `build_index.py`.

---

## System Architecture

```
User Query
    │
    ├─[1] fastembed bge-small-en-v1.5 (ONNX, local CPU, ~80ms)
    │       23MB model · no API key · no GPU needed
    │
    ├─[2] BM25 Sparse Retrieval (rank_bm25, ~5ms)
    │
    ├─[3] Per-list Deduplication by IS code
    │
    ├─[4] Reciprocal Rank Fusion (RRF k=60)
    │
    ├─[5] Registry Verification — Hallucination Shield
    │       Only valid IS codes from parsed registry can be returned
    │
    └─[6] Output: top-5 IS codes + latency
```

For the web UI and WhatsApp bot, GPT-4o additionally generates rationale, compliance roadmap, and Hindi translation (requires `OPENAI_API_KEY` in `.env`).

---

## Innovation Highlights

- **Standard-as-Card Multi-Vector Chunking**: Each IS standard is indexed as 3 separate chunks — scope, requirements, and full text — queried independently before RRF fusion. Gives the retriever three angles to match from.
- **Per-list Deduplication before RRF**: Prevents standards with 3 chunks from accumulating unfair scores over standards whose scope chunk was mis-parsed. Fixes the multi-part standard disambiguation problem.
- **Fully Local Inference**: Uses fastembed (ONNX runtime, no PyTorch) for sub-300ms latency on any CPU. Zero network calls during scoring.
- **Hallucination Shield**: Every returned IS code is verified against the parsed registry — the LLM cannot invent standards that don't exist in the dataset.
- **Knowledge Graph**: 533 standards × 600+ cross-reference edges. D3.js force-directed visualization showing standard interdependencies.
- **Multi-channel delivery**: Web UI (Next.js), WhatsApp bot (Twilio + Whisper voice transcription), React Native mobile app.
- **Compliance Roadmap**: For each recommended standard: required tests, license type, estimated cost range, compliance timeline.
- **Hindi Support**: One-click translation of all rationale and roadmap output.

---

## Dataset

**BIS SP 21:2005** — Summaries of Indian Standards for Building Materials
- 929 pages · 533 standards · 27 sections
- 1602 chunks (3 per standard: scope / requirements / full text)
- Parsed with PyMuPDF using "SUMMARY OF IS" boundary detection

---

## Repository Structure

```
├── inference.py              # Judge entry point
├── eval_script.py            # Provided evaluation script
├── requirements.txt
├── data/
│   ├── public_test_set.json  # Public test queries
│   └── processed/
│       ├── faiss_local.index      # Pre-built dense index (384-dim)
│       ├── faiss_local_meta.json
│       ├── bm25.pkl               # Pre-built sparse index
│       ├── chunks.jsonl           # 1602 text chunks
│       ├── registry.json          # 533 standards metadata
│       └── graph.json             # Knowledge graph
├── src/
│   ├── pipeline.py           # RAG orchestration
│   ├── retrieval/            # embedder, vector_store, bm25, hybrid
│   ├── ingestion/            # pdf_parser, graph_builder
│   ├── generation/           # rationale, roadmap, hindi
│   └── api/                  # FastAPI endpoints + WhatsApp webhook
├── frontend/                 # Next.js web app
├── mobile/                   # Expo React Native app
└── scripts/
    └── build_index.py        # Rebuild indexes from PDF (not needed for judges)
```

---

## Optional: Rebuild Indexes from Scratch

Only needed if you want to re-parse the PDF. Requires `dataset.pdf` in `data/raw/`.

```bash
python scripts/build_index.py
```

Takes ~10 minutes on CPU (one-time operation).

---

## Optional: Run the Full Web Stack

Requires `OPENAI_API_KEY` in `.env` (copy from `.env.example`).

```bash
# Backend API
uvicorn src.api.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
# Open http://localhost:3000

# Mobile app
cd mobile && npm install && npx expo start
```

---

## Environment Variables (optional — only for web UI)

Copy `.env.example` to `.env`:

| Variable | Required for | Description |
|---|---|---|
| `OPENAI_API_KEY` | Web UI rationale/roadmap/Hindi | OpenAI API key |
| `TWILIO_ACCOUNT_SID` | WhatsApp bot | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | WhatsApp bot | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp bot | Twilio sandbox number |

**The scoring script `inference.py` requires none of these.**

---

## Built for BIS × SS Hackathon · May 2026
