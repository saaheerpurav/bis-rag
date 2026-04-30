# BIS Compliance Co-pilot

**AI-powered BIS Standards Recommendation Engine for Indian MSEs**

> Hackathon submission for BIS × SS Hackathon — Theme: Accelerating MSE Compliance

## Quick Start

### 1. Set up environment
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 3. Build index (one-time, ~5-10 min with OpenAI embeddings)
```bash
# Place dataset.pdf in data/raw/ first
python scripts/build_index.py
```

### 4. Run judge evaluation
```bash
python inference.py --input data/public_test_set.json --output data/public_results.json
python eval_script.py --results data/public_results.json
```

### 5. Start the backend API
```bash
uvicorn src.api.main:app --reload --port 8000
```

### 6. Start the web frontend
```bash
cd frontend && npm install && npm run dev
# Open http://localhost:3000
```

### 7. Start the mobile app
```bash
cd mobile && npm install && npx expo start
# Scan QR code with Expo Go app
```

## Architecture

```
User Query
    ↓
[1] Query Decomposition (GPT-4o-mini)
    ↓
[2] HyDE — Hypothetical Document Embedding (GPT-4o)
    ↓
[3] Parallel Retrieval
    ├── Dense: FAISS (OpenAI text-embedding-3-large)
    └── Sparse: BM25 (rank_bm25)
    ↓
[4] Reciprocal Rank Fusion (RRF k=60)
    ↓
[5] BGE Cross-Encoder Rerank (bge-reranker-base)
    ↓
[6] Registry Verification (hallucination shield)
    ↓
[7] GPT-4o Rationale + Compliance Roadmap
```

## Innovation Highlights

- **Standard-as-Card Multi-Vector Chunking**: Each IS standard is chunked into 3 vectors (scope/identity, requirements, full text) and queried separately before RRF fusion.
- **HyDE (Hypothetical Document Embeddings)**: GPT-4o generates a fake "ideal BIS standard" for the query. Embedding the hypothetical document instead of the raw query gives +10-20% recall.
- **Knowledge Graph**: 533 standards × 600+ cross-reference edges. D3.js force-directed visualization.
- **Hallucination Shield**: LLM can only return IS codes from the verified registry.
- **WhatsApp Bot**: MSEs can text or send voice notes. Whisper transcribes voice → same pipeline.
- **Hindi Support**: One-click translation of rationale and roadmap.
- **Compliance Roadmap**: For each standard: required tests, license type, cost range, timeline.

## Dataset

BIS SP 21:2005 — Summaries of Indian Standards for Building Materials
- 929 pages · 534 standards · 27 sections · 1602 chunks

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes (for full quality) | OpenAI API key |
| `TWILIO_ACCOUNT_SID` | For WhatsApp | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For WhatsApp | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | For WhatsApp | Twilio sandbox number |

**Fallback**: If `OPENAI_API_KEY` is not set, the system uses local BGE embeddings (BAAI/bge-large-en-v1.5). No HyDE or rationale generation. Metrics will be lower but system is fully functional.

## Evaluation Results (Public Test Set)

Run `python eval_script.py --results data/public_results.json` to see current scores.

Target: Hit Rate @3 > 80%, MRR @5 > 0.7, Avg Latency < 5s

## Team

Built for BIS × SS Hackathon, May 2026
