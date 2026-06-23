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
import urllib.request
import urllib.parse
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
REVIEWS_JS      = ROOT / "reviews.js"
HORROR_VAULT_JS = ROOT / "horror-vault.js"

# ── Category weights per day type ─────────────────────────────────────────────
WEEKDAY_WEIGHTS = {"movies": 0.40, "tv": 0.30, "horror_vault": 0.10, "games": 0.20}
WEEKEND_WEIGHTS = {"movies": 0.20, "tv": 0.20, "horror_vault": 0.30, "games": 0.30}

# Map your queue category names → reviews.js category values
CATEGORY_MAP = {
    "movies":       "movie",
    "tv":           "tv",
    "horror_vault": "movie",   # horror vault entries go in as movies
    "games":        "game",
}


# ── Helpers ───────────────────────────────────────────────────────────────────
def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def normalize_title(s):
    s = str(s or "").lower().replace("&", "and")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return s.strip()

def get_existing_review_keys():
    """Set of 'normalized title|year' for everything already in reviews.js."""
    source = REVIEWS_JS.read_text(encoding="utf-8")
    titles = re.findall(r'"title"\s*:\s*"([^"]+)"', source)
    years  = re.findall(r'"year"\s*:\s*(\d+)', source)
    return {f"{normalize_title(t)}|{y}" for t, y in zip(titles, years)}

def load_vault_backlog():
    """Titles already watched in horror-vault.js that don't have a review yet."""
    source = HORROR_VAULT_JS.read_text(encoding="utf-8")
    entries = re.findall(
        r'\{\s*"title":\s*"([^"]+)",\s*"year":\s*(\d+|null),.*?"status":\s*"([^"]+)"',
        source, re.DOTALL
    )
    existing = get_existing_review_keys()
    backlog = []
    for title, year, status in entries:
        if status == "excluded" or not year or year == "null":
            continue
        if f"{normalize_title(title)}|{year}" in existing:
            continue
        backlog.append({"title": title, "year": int(year)})
    return backlog

def fetch_tmdb_full_details(title, year):
    """Best-effort fetch of genre/runtime/director/rating for a vault backlog title."""
    api_key = "901e304e38b7fb43f193ee28baf95720"
    try:
        query = urllib.parse.quote(str(title))
        search_url = f"https://api.themoviedb.org/3/search/movie?api_key={api_key}&query={query}&year={year}&language=en-US"
        with urllib.request.urlopen(search_url, timeout=10) as r:
            results = json.loads(r.read().decode()).get("results", [])
        if not results:
            return None
        movie_id = results[0]["id"]

        detail_url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={api_key}&append_to_response=credits,release_dates&language=en-US"
        with urllib.request.urlopen(detail_url, timeout=10) as r:
            detail = json.loads(r.read().decode())

        genres = [g["name"] for g in detail.get("genres", [])] or ["Horror"]
        runtime = f"{detail['runtime']} min" if detail.get("runtime") else "?? min"

        director = "Unknown"
        for c in detail.get("credits", {}).get("crew", []):
            if c.get("job") == "Director":
                director = c.get("name")
                break

        rating = "NR"
        for entry in detail.get("release_dates", {}).get("results", []):
            if entry.get("iso_3166_1") == "US":
                for rd in entry.get("release_dates", []):
                    if rd.get("certification"):
                        rating = rd["certification"]
                        break
                break

        return {"title": title, "year": year, "director": director, "runtime": runtime,
                "rating": rating, "genre": genres, "streaming": "Various"}
    except Exception as e:
        print(f"TMDB full details fetch failed for '{title}' ({year}): {e}")
        return None

def pick_title(queue):
    today      = datetime.now()
    is_weekend = today.weekday() >= 5
    weights    = WEEKEND_WEIGHTS if is_weekend else WEEKDAY_WEIGHTS

    pool, pool_weights = [], []
    for category, weight in weights.items():
        items = [i for i in queue.get(category, []) if not i.get("done") and not i.get("skip")]
        if not items:
            continue
        for item in items:
            pool.append((category, item))
            pool_weights.append(weight / len(items))

    if pool:
        return random.choices(pool, weights=pool_weights, k=1)[0]

    print("Queue staging list is empty — falling back to horror vault backlog...")
    backlog = load_vault_backlog()
    if not backlog:
        print("Queue is empty — all titles reviewed!")
        sys.exit(0)

    pick = random.choice(backlog)
    print(f"Vault backlog: {len(backlog)} unreviewed titles remaining. Picked '{pick['title']}' ({pick['year']}).")
    details = fetch_tmdb_full_details(pick["title"], pick["year"]) or {
        "title": pick["title"], "year": pick["year"], "director": "Unknown",
        "runtime": "?? min", "rating": "NR", "genre": ["Horror"], "streaming": "Various",
    }
    return ("horror_vault", details)

def get_pre_logged_score(item, seen_scores):
    key = f"{item['title']} ({item.get('year', '')})"
    if key in seen_scores:
        return seen_scores[key]
    if item.get("score") is not None:
        return {"score": item["score"], "notes": item.get("notes")}
    return None

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
  "score": <number 1-10, one decimal place allowed>,
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

def make_slug(title, year=""):
    """Generate a URL slug from a review title."""
    import unicodedata
    slug = title.lower()
    # normalise unicode then strip non-ASCII
    slug = unicodedata.normalize("NFKD", slug).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = slug.strip()
    slug = re.sub(r"[\s-]+", "-", slug)
    slug = slug.strip("-")
    if not slug.endswith("-review"):
        slug += "-review"
    return slug

def unique_slug(base_slug, existing_slugs):
    """Ensure slug is unique, appending a counter if needed."""
    if base_slug not in existing_slugs:
        return base_slug
    counter = 2
    while f"{base_slug}-{counter}" in existing_slugs:
        counter += 1
    return f"{base_slug}-{counter}"

def get_existing_slugs():
    """Read all slugs already in reviews.js."""
    try:
        source = REVIEWS_JS.read_text(encoding="utf-8")
        return set(re.findall(r'"slug"\s*:\s*"([^"]+)"', source))
    except Exception:
        return set()

def build_review_entry(category, item, parsed):
    """Build a dict that matches your reviews.js object structure exactly."""
    title    = item["title"]
    year     = item.get("year", "")
    season   = item.get("season", "")
    genres   = item.get("genre", [])
    is_game  = category == "games"
    director = item.get("developer", "") if is_game else item.get("director", "")
    playtime = item.get("playtime", "")
    runtime  = (f"~{playtime}" if playtime else "?? hours") if is_game else item.get("runtime", "")
    rating   = item.get("rating", "")
    season_str = f" Season {season}" if season else ""
    full_title = f"{title}{season_str}"

    uid = int(datetime.now().timestamp() * 1000)

    base_slug = make_slug(full_title)
    existing  = get_existing_slugs()
    slug      = unique_slug(base_slug, existing)

    year_suffix  = f" ({year})" if year else ""
    seo_title    = f"{full_title} Review{year_suffix} | WretVision"
    raw_desc     = parsed.get("excerpt") or parsed.get("verdict") or f"{full_title} review on WretVision."
    seo_description = raw_desc[:157] + "..." if len(raw_desc) > 160 else raw_desc
    if len(seo_description) > 160:
        print(f"WARNING: SEO description exceeds 160 chars for '{full_title}' ({len(seo_description)} chars)")

    entry = {
        "id":             uid,
        "slug":           slug,
        "seoTitle":       seo_title,
        "seoDescription": seo_description,
        "category":       CATEGORY_MAP.get(category, "movie"),
        "title":          full_title,
        "year":           year,
        "director":       director,
        "runtime":        runtime if runtime else "?? min",
        "rating":         rating,
        "genres":         genres,
        "score":          parsed["score"],
        "featured":       False,
        "excerpt":        parsed["excerpt"],
        "body":           parsed["paragraphs"],
        "images":         [],
        "verdict":        parsed["verdict"],
    }
    if is_game:
        steam_id = item.get("steam_id")
        if steam_id:
            media = fetch_steam_media(steam_id)
            if media:
                entry["media"] = media
    else:
        media = fetch_tmdb_media(title, year)
        if media:
            entry["media"] = media
    return entry

def is_horror(category, item):
    """Return True if this title belongs in the horror vault. Movies only — never TV or games."""
    if category not in ("movies", "horror_vault"):
        return False
    if category == "horror_vault":
        return True
    return any("horror" in g.lower() for g in item.get("genre", []))

def get_decade(year):
    try:
        return f"{(int(year) // 10) * 10}s"
    except (TypeError, ValueError):
        return "Unknown"

def add_to_horror_vault(title, year):
    """Inject title into horror-vault.js if not already present."""
    source = HORROR_VAULT_JS.read_text(encoding="utf-8")

    existing_titles = re.findall(r'"title"\s*:\s*"([^"]+)"', source)
    if any(t.lower().strip() == title.lower().strip() for t in existing_titles):
        print(f"'{title}' already in horror vault — skipping.")
        return

    id_matches = re.findall(r'"id"\s*:\s*(\d+)', source)
    next_id = max(int(i) for i in id_matches) + 1 if id_matches else 1

    new_entry = {
        "title": title,
        "year":  year,
        "decade": get_decade(year),
        "status": "watched",
        "note":  "",
        "id":    next_id,
    }

    raw_json = json.dumps(new_entry, indent=2, ensure_ascii=False)
    indented  = "\n".join("  " + line for line in raw_json.splitlines())
    new_block = indented + ",\n"

    marker = "const HORROR_VAULT = ["
    pos    = source.find(marker)
    if pos == -1:
        print("Warning: could not find HORROR_VAULT array — skipping vault update.")
        return

    insert_at = pos + len(marker)
    if source[insert_at] == "\n":
        insert_at += 1

    updated = source[:insert_at] + new_block + source[insert_at:]
    HORROR_VAULT_JS.write_text(updated, encoding="utf-8")
    print(f"Added '{title}' ({year}) to horror vault.")

def fetch_steam_media(steam_id):
    """Fetch poster + backdrop from Steam store API. No auth required."""
    try:
        url = f"https://store.steampowered.com/api/appdetails?appids={steam_id}"
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read().decode())
        app_data = data.get(str(steam_id), {}).get("data", {})
        if not app_data:
            print(f"Steam: no data for app ID {steam_id}")
            return None
        poster   = f"https://cdn.akamai.steamstatic.com/steam/apps/{steam_id}/library_600x900_2x.jpg"
        backdrop = (app_data.get("background_raw", "") or
                    app_data.get("background", "") or
                    (app_data.get("screenshots") or [{}])[0].get("path_full", ""))
        media = {
            "poster":   poster,
            "backdrop": backdrop or poster,
        }
        print(f"Steam: found images for app ID {steam_id}")
        return media
    except Exception as e:
        print(f"Steam fetch failed: {e}")
        return None

def fetch_tmdb_media(title, year):
    """Fetch poster + backdrop from TMDB. Returns media dict or None."""
    api_key = "901e304e38b7fb43f193ee28baf95720"
    try:
        query = urllib.parse.quote(str(title))
        url   = f"https://api.themoviedb.org/3/search/movie?api_key={api_key}&query={query}&year={year}&language=en-US"
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read().decode())
        results = data.get("results", [])
        if not results:
            print(f"TMDB: no results for '{title}' ({year})")
            return None
        movie    = results[0]
        poster   = movie.get("poster_path")
        backdrop = movie.get("backdrop_path")
        if not poster and not backdrop:
            return None
        media = {
            "poster":   f"https://image.tmdb.org/t/p/w500{poster}"    if poster   else "",
            "backdrop": f"https://image.tmdb.org/t/p/w1280{backdrop}" if backdrop else "",
        }
        print(f"TMDB: found poster for '{title}'")
        return media
    except Exception as e:
        print(f"TMDB fetch failed: {e}")
        return None

def inject_into_reviews_js(entry):
    """
    Reads reviews.js, injects the new entry at the very top of the REVIEWS array,
    and writes the file back. Matches your existing formatting style.
    Aborts on ID collision, slug collision, or count mismatch — never overwrites.
    """
    source = REVIEWS_JS.read_text(encoding="utf-8")

    existing_ids   = set(re.findall(r'"id"\s*:\s*(\d+)', source))
    existing_slugs = set(re.findall(r'"slug"\s*:\s*"([^"]+)"', source))
    count_before   = len(existing_ids)

    new_id   = str(entry["id"])
    new_slug = entry.get("slug", "")

    if new_id in existing_ids:
        raise RuntimeError(
            f"ABORT: ID {new_id} already exists in reviews.js — duplicate entry prevented."
        )
    if new_slug and new_slug in existing_slugs:
        raise RuntimeError(
            f"ABORT: Slug '{new_slug}' already exists in reviews.js — duplicate entry prevented."
        )

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

    count_after = len(set(re.findall(r'"id"\s*:\s*(\d+)', updated)))
    if count_after != count_before + 1:
        raise RuntimeError(
            f"ABORT: Count check failed — before: {count_before}, after: {count_after} "
            f"(expected {count_before + 1}). reviews.js was NOT written."
        )

    REVIEWS_JS.write_text(updated, encoding="utf-8")

    print(f"Reviews before : {count_before}")
    print(f"New review     : '{entry['title']}' | slug: {new_slug or 'none'}")
    print(f"Reviews after  : {count_after}")
    print(f"Count check    : OK (+1)")

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

    if is_horror(category, item):
        add_to_horror_vault(item["title"], item.get("year", ""))

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
