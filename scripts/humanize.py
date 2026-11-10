"""
WretVision - Text Hygiene & Humanization Module
Provides zero-dependency deterministic cleaning and humanizer passes adapted
from watermarks-remover to ensure all review prose is stripped of AI markers,
invisible Unicode, and formulaic AI syntax.
"""

from __future__ import annotations

import re
import unicodedata

# ── 1. Deterministic Humanizer Transforms ─────────────────────────────────────

_PHRASE_SWAPS: tuple[tuple[str, str], ...] = (
    (r"\bin order to\b", "to"),
    (r"\bdue to the fact that\b", "because"),
    (r"\bat this point in time\b", "now"),
    (r"\bin the event that\b", "if"),
    (r"\bhas the ability to\b", "can"),
    (r"\bhave the ability to\b", "can"),
    (r"\bit is important to note that\b", "note that"),
    (r"\bit is worth noting that\b", "note that"),
    (r"\bdelve into\b", "explore"),
    (r"\bdelves into\b", "explores"),
    (r"\bdelved into\b", "explored"),
    (r"\bdelving into\b", "exploring"),
    (r"\bwhat works here is\b", "what hits best is"),
    (r"\bwhere the film drags slightly is\b", "the only real drag is"),
    (r"\bwhere it falls short is\b", "where it stumbles is"),
    (r"\bin the craft department\b", "across the board"),
    (r"\bsits comfortably alongside\b", "stands right next to"),
    (r"\bearns its place next to\b", "holds its own against"),
)

_WORD_SWAPS: dict[str, str] = {
    "utilize": "use",
    "utilizes": "uses",
    "utilized": "used",
    "utilizing": "using",
}

_WORD_RE = re.compile(r"\b(?:utilize|utilizes|utilized|utilizing)\b", re.IGNORECASE)


def _capitalize_like(matched: str, replacement: str) -> str:
    if matched.isupper():
        return replacement.upper()
    return replacement.capitalize() if matched[0].isupper() else replacement


def _straighten_quotes(text: str) -> str:
    for ch in ("\u2018", "\u2019"):
        text = text.replace(ch, "'")
    for ch in ("\u201c", "\u201d"):
        text = text.replace(ch, '"')
    return text


def _replace_dashes(text: str) -> str:
    dash = re.compile(r"\s*[\u2014\u2013]\s*")
    dbl_hyphen = re.compile(r"(\s*)--(\s*)")

    def _dash_sub(m: re.Match[str]) -> str:
        left = text[m.start() - 1] if m.start() > 0 else ""
        right = text[m.end()] if m.end() < len(text) else ""
        if left.isdigit() and right.isdigit():
            return m.group(0)
        return ", "

    def _dbl_sub(m: re.Match[str]) -> str:
        leading, trailing = m.group(1), m.group(2)
        hyphen_start = m.start() + len(leading)
        hyphen_end = m.end() - len(trailing)
        before = text[hyphen_start - 1] if hyphen_start > 0 else ""
        after = text[hyphen_end] if hyphen_end < len(text) else ""
        if after.isalnum() and (not before or not before.isalnum()):
            return m.group(0)
        return ", "

    text = dash.sub(_dash_sub, text)
    text = dbl_hyphen.sub(_dbl_sub, text)
    text = re.sub(r",\s*,\s*", ", ", text)
    text = re.sub(r"\s*,\s*([.!?])", r"\1", text)
    return text


def _collapse_phrases(text: str) -> str:
    for pattern, repl in _PHRASE_SWAPS:
        text = re.sub(
            pattern,
            lambda m, r=repl: _capitalize_like(m.group(0), r),
            text,
            flags=re.IGNORECASE,
        )
    return text


def _swap_words(text: str) -> str:
    return _WORD_RE.sub(
        lambda m: _capitalize_like(m.group(0), _WORD_SWAPS[m.group(0).lower()]),
        text,
    )


def humanize_pass(text: str) -> str:
    """Apply deterministic humanizer transforms."""
    if not text:
        return text
    text = _straighten_quotes(text)
    text = _replace_dashes(text)
    text = _collapse_phrases(text)
    text = _swap_words(text)
    return text


# ── 2. Unicode Sanitizer (Layer A) ────────────────────────────────────────────

_SUSPICIOUS_CHARS = {
    0x200B,  # Zero-width space
    0x200C,  # Zero-width non-joiner
    0x200D,  # Zero-width joiner
    0xFEFF,  # Byte order mark
    0x202A,  # LRE
    0x202B,  # RLE
    0x202D,  # LRO
    0x202E,  # RLO
    0x202C,  # PDF
    0x2066,  # LRI
    0x2067,  # RLI
    0x2068,  # FSI
    0x2069,  # PDI
    0x00AD,  # Soft hyphen
}


def clean_unicode(text: str) -> str:
    """Strip zero-width, bidi and unprintable Unicode characters."""
    if not text:
        return text
    out = []
    for ch in text:
        cp = ord(ch)
        if cp in _SUSPICIOUS_CHARS:
            continue
        if unicodedata.category(ch) == "Cf" and cp not in (0x200C, 0x200D):
            continue
        out.append(ch)
    cleaned = "".join(out)
    # Normalize exotic spaces to standard ascii space
    cleaned = re.sub(r"[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]", " ", cleaned)
    return cleaned


def process_review_text(text: str) -> str:
    """Run both Unicode sanitation and deterministic humanization."""
    return humanize_pass(clean_unicode(text))
