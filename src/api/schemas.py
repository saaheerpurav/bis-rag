from pydantic import BaseModel
from typing import Optional, List


class QueryRequest(BaseModel):
    query: str
    top_n: int = 5
    include_rationale: bool = True
    include_roadmap: bool = False
    language: str = "en"  # "en" or "hi"


class StandardResult(BaseModel):
    is_code: str
    is_code_norm: str = ""
    year: int
    title: str
    section: int
    section_name: str
    confidence: float
    rationale: Optional[str] = None
    roadmap: Optional[dict] = None
    page_start: int = 0
    cross_refs: List[str] = []
    is_code_formatted: str


class QueryResponse(BaseModel):
    query: str
    retrieved_standards: List[str]
    results: List[StandardResult]
    latency_seconds: float
    decomposed: Optional[dict] = None


class VoiceRequest(BaseModel):
    language: str = "en"


class WhatsAppMessage(BaseModel):
    Body: str = ""
    From: str = ""
    MediaUrl0: Optional[str] = None
    MediaContentType0: Optional[str] = None
