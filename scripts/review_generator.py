"""
WRETVISION — Daily Review Generator
Picks a title from the queue, writes a review in your voice using Claude,
and injects it at the TOP of reviews.js in the exact same format your
manual new-review.html uses. Nothing else changes in the file.
"""

import json
import os
import random
import re
import sys
from datetime import datetime
from pathlib import Path

import anthropic

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT        = Path(__file__).parent.parent
DATA        = ROOT / "data"
QUEUE_FILE  = DATA / "queue.json"
SCORES_FILE = DATA / "seen_scores.json"
PERSONALITY = DATA / "personality.md"

# ── This is the only path you need to set ─────────────────────────────────────
# Point it at your reviews.js file inside your repo.
REVIEWS_JS  = ROOT / "reviews.js"          # ← adjust if yours lives elsewhere
#              e.g. ROOT / "js" / "reviews.js"
#              e.g. ROOT / "data" / "reviews.js"

# ── Category weights per day type ─────────────────────────────────────────────
WEEKDAY_WEIGHTS = {"movies": 0.50, "tv": 0.40, "horror_vault": 0.10}
WEEKEND_WEIGHTS = {"movies": 0.30, "tv": 0.30, "horror_vault": 0.40}

# Map your queue category names → reviews.js category values
CATEGORY_MAP = {
    "movies":       "movie",
    "tv":           "tv",
    "horror_vault": "movie",   # horror vault entries go in as movies
}


# ── Helpers ───────────────────────────────────────────────────────────────────
def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def pick_title(queue):
    today      = datetime.now()
    is_weekend = today.weekday() >= 5
    weights    = WEEKEND_WEIGHTS if is_weekend else WEEKDAY_WEIGHTS

    pool, pool_weights = [], []
    for category, weight in weights.items():
        items = [i for i in queue.get(category, []) if not i.get("done")]
        if not items:
            continue
        for item in items:
            pool.append((category, item))
            pool_weights.append(weight / len(items))

    if not pool:
        print("Queue is empty — all titles reviewed!")
        sys.exit(0)

    return random.choices(pool, weights=pool_weights, k=1)[0]

def get_pre_logged_score(item, seen_scores):
    key = f"{item['title']} ({item.get('year', '')})"
    return seen_scores.get(key)

def build_prompt(category, item, personality, pre_score):
    title     = item["title"]
    year      = item.get("year", "")
    season    = item.get("season", "")
    genres    = ", ".join(item.get("genre", []))
    streaming = item.get("streaming", "")
    season_str = f" Season {season}" if season else ""

    score_block = ""
    if pre_score:
        score_block = f"""
CRITICAL — PRE-LOGGED SCORE:
The reviewer has already watched this and their gut score is {pre_score['score']}/10.
Their notes: {pre_score.get('notes', 'none')}
You MUST write the review so it justifies exactly this score. Do not deviate.
"""

    return f"""You are a film and TV review writer. Write EXACTLY in the voice described below.

=== REVIEWER PERSONALITY ===
{personality}
=== END PERSONALITY ===

{score_block}

Write a review for:
Title: {title}{season_str} ({year})
Category: {category.replace('_', ' ').title()}
Genre: {genres}
Streaming: {streaming}

Output format — respond with a JSON object and nothing else, no markdown fences:
{{
  "score": <integer 1-10>,
  "excerpt": "<one sentence hook, under 200 characters, punchy>",
  "paragraphs": [
    "<paragraph 1>",
    "<paragraph 2>",
    "<paragraph 3>"
  ],
  "verdict": "<one closing sentence, the gut-punch summary>"
}}

Rules:
- 3 paragraphs, each 150-200 words
- Sound like the reviewer — specific, opinionated, no filler
- excerpt is what shows on the card before someone clicks in
- verdict is the final line inside the full review
- SEO: naturally work in the title, year, genre, streaming platform, and 1-2 comparable titles
- score MUST match the pre-logged score if one was given
- No markdown inside the strings, no escaped newlines, clean plain text only
- Never use hyphens or em dashes, use commas or rewrite the sentence instead
"""

def call_claude(prompt):
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text.strip()

def parse_response(raw):
    """Strip any accidental markdown fences and parse JSON."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())
    return json.loads(cleaned)

def build_review_entry(category, item, parsed):
    """Build a dict that matches your reviews.js object structure exactly."""
    title    = item["title"]
    year     = item.get("year", "")
    season   = item.get("season", "")
    genres   = item.get("genre", [])
    director = item.get("director", "")
    runtime  = item.get("runtime", "")
    rating   = item.get("rating", "")
    season_str = f" Season {season}" if season else ""

    uid = int(datetime.now().timestamp() * 1000)

    return {
        "id":       uid,
        "category": CATEGORY_MAP.get(category, "movie"),
        "title":    f"{title}{season_str}",
        "year":     year,
        "director": director,
        "runtime":  runtime if runtime else "?? min",
        "rating":   rating,
        "genres":   genres,
        "score":    parsed["score"],
        "featured": False,
        "excerpt":  parsed["excerpt"],
        "body":     parsed["paragraphs"],
        "images":   [],
        "verdict":  parsed["verdict"],
    }

def inject_into_reviews_js(entry):
    """
    Reads reviews.js, injects the new entry at the very top of the REVIEWS array,
    and writes the file back. Matches your existing formatting style.
    """
    source = REVIEWS_JS.read_text(encoding="utf-8")

    raw_json = json.dumps(entry, indent=2, ensure_ascii=False)
    indented = "\n".join("    " + line for line in raw_json.splitlines())
    new_block = indented + ",\n"

    marker = "const REVIEWS = ["
    pos    = source.find(marker)
    if pos == -1:
        raise ValueError("Could not find 'const REVIEWS = [' in reviews.js — check the path.")

    insert_at = pos + len(marker)
    if source[insert_at] == "\n":
        insert_at += 1

    updated = source[:insert_at] + new_block + source[insert_at:]
    REVIEWS_JS.write_text(updated, encoding="utf-8")
    print(f"Injected '{entry['title']}' at top of reviews.js")

def main():
    print(f"WRETVISION review bot — {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    queue       = load_json(QUEUE_FILE)
    seen_scores = load_json(SCORES_FILE)
    personality = PERSONALITY.read_text(encoding="utf-8")

    category, item = pick_title(queue)
    title      = item["title"]
    season     = item.get("season", "")
    season_str = f" Season {season}" if season else ""
    print(f"Picked: {title}{season_str} ({item.get('year', '')}) [{category}]")

    pre_score = get_pre_logged_score(item, seen_scores)
    if pre_score:
        print(f"Pre-logged score: {pre_score['score']}/10")
    else:
        print("No pre-logged score — AI will judge (slightly skeptical)")

    print("Calling Claude...")
    prompt = build_prompt(category, item, personality, pre_score)
    raw    = call_claude(prompt)

    try:
        parsed = parse_response(raw)
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}\nRaw response:\n{raw}")
        sys.exit(1)

    print(f"Score: {parsed['score']}/10")

    entry = build_review_entry(category, item, parsed)
    inject_into_reviews_js(entry)

    for q_item in queue.get(category, []):
        if q_item["title"] == item["title"] and q_item.get("year") == item.get("year"):
            q_item["done"] = True
            break
    save_json(QUEUE_FILE, queue)
    print("Queue updated.")

    display = f"{title}{season_str} ({item.get('year', '')})"
    Path("/tmp/review_title.txt").write_text(display)
    print("Done!")

if __name__ == "__main__":
    main()
