"""
Parse BIS SP 21 PDF into structured standard records.
Each standard is bounded by 'SUMMARY OF\nIS XXXX : YYYY TITLE'.
"""
import re
import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional
import fitz  # PyMuPDF

IS_HEADER_RE = re.compile(
    r"IS\s+([\d]+(?:\s*\(Part\s*[\d]+\))?(?:\s*\(Part\s*[\w]+\))?)\s*"
    r"(?:\(PART\s*[\d]+\)\s*)?:\s*(\d{4})\s+(.+)",
    re.IGNORECASE,
)
CROSS_REF_RE = re.compile(
    r"IS\s+([\d]+(?:\s*\(Part\s*[\d]+\))?(?:\s*\(Part\s*[\w]+\))?)\s*:\s*(\d{4})",
    re.IGNORECASE,
)
SECTION_RE = re.compile(r"^SECTION\s+(\d+)\s*$", re.MULTILINE)

SECTION_NAMES = {
    1: "Cement and Concrete",
    2: "Building Limes",
    3: "Stones",
    4: "Wood Products for Building",
    5: "Gypsum Building Materials",
    6: "Timber",
    7: "Bitumen and Tar Products",
    8: "Floor, Wall, Roof Coverings and Finishes",
    9: "Water Proofing and Damp Proofing Materials",
    10: "Sanitary Appliances and Water Fittings",
    11: "Builders Hardware",
    12: "Wood Products",
    13: "Doors, Windows and Shutters",
    14: "Concrete Reinforcement",
    15: "Structural Steels",
    16: "Light Metal and Their Alloys",
    17: "Structural Shapes",
    18: "Welding Electrodes and Wires",
    19: "Threaded Fasteners and Rivets",
    20: "Wire Ropes and Wire Products",
    21: "Glass",
    22: "Fillers, Stoppers and Putties",
    23: "Thermal Insulation Materials",
    24: "Plastics",
    25: "Conductors and Cables",
    26: "Wiring Accessories",
    27: "General",
}


@dataclass
class BISStandard:
    is_code: str           # "IS 269"
    is_code_norm: str      # "is269"  — normalized for matching
    year: int
    title: str
    section: int
    section_name: str
    scope: str
    requirements: str
    full_text: str
    cross_refs: list = field(default_factory=list)
    page_start: int = 0
    page_end: int = 0
    revision: str = ""

    def to_dict(self):
        return asdict(self)


def normalize_code(code: str) -> str:
    return re.sub(r"[\s:\-()]", "", code).lower()


def extract_section(text: str) -> Optional[int]:
    m = SECTION_RE.search(text)
    if m:
        return int(m.group(1))
    return None


def extract_scope(text: str) -> str:
    """Extract the Scope paragraph (section 1.) from standard text."""
    m = re.search(r"1\.\s*Scope[^\n]*\n(.+?)(?=\n\d+\.|\Z)", text, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()[:1500]
    # fallback: first 500 chars after header
    lines = text.strip().split("\n")
    return " ".join(lines[:8]).strip()[:1000]


def extract_requirements(text: str) -> str:
    """Extract requirements / physical / chemical sections."""
    parts = re.findall(
        r"\d+\.\s*(?:Chemical|Physical|Dimensional|Requirements?|Properties|Composition)[^\n]*\n(.+?)(?=\n\d+\.|\Z)",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    combined = " ".join(p.strip() for p in parts)[:3000]
    return combined if combined else text[:2000]


def extract_cross_refs(text: str) -> list:
    refs = set()
    for m in CROSS_REF_RE.finditer(text):
        raw = f"IS {m.group(1).strip()}: {m.group(2)}"
        refs.add(raw)
    return sorted(refs)


def parse_pdf(pdf_path: Path) -> list:
    """Parse PDF and return list of BISStandard objects."""
    doc = fitz.open(str(pdf_path))
    total_pages = len(doc)
    print(f"  Opened PDF: {total_pages} pages")

    # Step 1: extract all page texts
    pages = []
    current_section = 1
    for i in range(total_pages):
        text = doc[i].get_text()
        s = extract_section(text)
        if s:
            current_section = s
        pages.append((i + 1, current_section, text))

    # Step 2: find all SUMMARY OF boundaries
    boundaries = []  # (page_idx_in_list, line_idx, section)
    for pi, (page_num, section, text) in enumerate(pages):
        lines = text.split("\n")
        for li, line in enumerate(lines):
            if "SUMMARY OF" in line:
                # find the IS ... : YYYY line in next 4 lines
                for ki in range(li + 1, min(li + 5, len(lines))):
                    candidate = lines[ki].strip()
                    m = IS_HEADER_RE.match(candidate)
                    if m:
                        code = m.group(1).strip()
                        year_str = m.group(2)
                        title = m.group(3).strip()
                        # look for revision on next line
                        revision = ""
                        if ki + 1 < len(lines) and "Revision" in lines[ki + 1]:
                            revision = lines[ki + 1].strip().strip("()")
                        boundaries.append({
                            "pi": pi,
                            "page_num": page_num,
                            "section": section,
                            "is_code": f"IS {code}",
                            "year": int(year_str),
                            "title": title,
                            "revision": revision,
                        })
                        break

    print(f"  Found {len(boundaries)} standards")

    # Step 3: extract text for each standard (from current boundary to next)
    standards = []
    for i, b in enumerate(boundaries):
        # collect text from boundary page to next boundary page
        start_pi = b["pi"]
        end_pi = boundaries[i + 1]["pi"] + 1 if i + 1 < len(boundaries) else len(pages)

        full_text = ""
        for pi in range(start_pi, min(end_pi, len(pages))):
            full_text += pages[pi][2] + "\n"

        # trim to relevant portion
        idx = full_text.find("SUMMARY OF")
        if idx >= 0:
            full_text = full_text[idx:]
        # cut at next SUMMARY OF
        next_idx = full_text.find("SUMMARY OF", 10)
        if next_idx > 0:
            full_text = full_text[:next_idx]

        scope = extract_scope(full_text)
        requirements = extract_requirements(full_text)
        cross_refs = extract_cross_refs(full_text)

        std = BISStandard(
            is_code=b["is_code"],
            is_code_norm=normalize_code(b["is_code"] + str(b["year"])),
            year=b["year"],
            title=b["title"],
            section=b["section"],
            section_name=SECTION_NAMES.get(b["section"], "General"),
            scope=scope,
            requirements=requirements,
            full_text=full_text[:4000],
            cross_refs=cross_refs,
            page_start=b["page_num"],
            page_end=pages[min(end_pi - 1, len(pages) - 1)][0],
            revision=b["revision"],
        )
        standards.append(std)

    doc.close()
    return standards


def save_registry(standards: list, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    registry = {}
    for s in standards:
        registry[s.is_code_norm] = s.to_dict()
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
    print(f"  Saved registry: {len(registry)} entries -> {out_path}")


def save_chunks(standards: list, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        for s in standards:
            # Write 3 chunk types per standard for multi-vector retrieval
            # Chunk A: identity + scope (for concept matching)
            chunk_a = {
                "chunk_id": f"{s.is_code_norm}_scope",
                "is_code": s.is_code,
                "is_code_norm": s.is_code_norm,
                "year": s.year,
                "title": s.title,
                "section": s.section,
                "section_name": s.section_name,
                "chunk_type": "scope",
                "text": f"{s.is_code}: {s.year} — {s.title}\nSection: {s.section_name}\nScope: {s.scope}",
                "page_start": s.page_start,
            }
            # Chunk B: requirements (for technical matching)
            chunk_b = {
                "chunk_id": f"{s.is_code_norm}_req",
                "is_code": s.is_code,
                "is_code_norm": s.is_code_norm,
                "year": s.year,
                "title": s.title,
                "section": s.section,
                "section_name": s.section_name,
                "chunk_type": "requirements",
                "text": f"{s.is_code}: {s.year} — {s.title}\nRequirements: {s.requirements}",
                "page_start": s.page_start,
            }
            # Chunk C: full text (for reranking)
            chunk_c = {
                "chunk_id": f"{s.is_code_norm}_full",
                "is_code": s.is_code,
                "is_code_norm": s.is_code_norm,
                "year": s.year,
                "title": s.title,
                "section": s.section,
                "section_name": s.section_name,
                "chunk_type": "full",
                "text": s.full_text[:2000],
                "page_start": s.page_start,
            }
            f.write(json.dumps(chunk_a, ensure_ascii=False) + "\n")
            f.write(json.dumps(chunk_b, ensure_ascii=False) + "\n")
            f.write(json.dumps(chunk_c, ensure_ascii=False) + "\n")
    print(f"  Saved chunks: {len(standards) * 3} chunks -> {out_path}")
