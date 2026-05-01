import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).parent.parent
DATA_RAW = ROOT / "data" / "raw"
DATA_PROCESSED = ROOT / "data" / "processed"

DATASET_PDF = DATA_RAW / "dataset.pdf"
REGISTRY_PATH = DATA_PROCESSED / "registry.json"
CHUNKS_PATH = DATA_PROCESSED / "chunks.jsonl"
GRAPH_PATH = DATA_PROCESSED / "graph.json"
FAISS_OPENAI_PATH = DATA_PROCESSED / "faiss_local.index"
FAISS_META_PATH = DATA_PROCESSED / "faiss_local_meta.json"
BM25_PATH = DATA_PROCESSED / "bm25.pkl"
CACHE_DIR = DATA_PROCESSED / "cache"

# Models
OPENAI_EMBED_MODEL = "text-embedding-3-large"  # kept for reference / web UI HyDE
OPENAI_EMBED_DIM = 3072
OPENAI_CHAT_MODEL = "gpt-4o"
OPENAI_MINI_MODEL = "gpt-4o-mini"
# Local inference embedder — ONNX, no GPU, ~23MB model
LOCAL_EMBED_MODEL = "BAAI/bge-small-en-v1.5"
LOCAL_EMBED_DIM = 384
RERANKER_MODEL = "BAAI/bge-reranker-base"  # not used in inference

# Retrieval
BM25_TOP_K = 30
DENSE_TOP_K = 30
RRF_K = 60
RERANK_TOP_N = 5

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
