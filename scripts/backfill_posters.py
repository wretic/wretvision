"""
WRETVISION — One-shot poster backfill
Finds any review in reviews.js missing a `media` field and fetches the
poster from TMDB, then patches the file in place.

Usage:
    TMDB_API_KEY=your_key python scripts/backfill_posters.py
"""

import json
import os
import re
import sys
import urllib.request
import urllib.parse
from pathlib import Path

ROOT       = Path(__file__).parent.parent
REVIEWS_JS = ROOT / "reviews.js"
TMDB_IMG   = "https://image.tmdb.org/t/p/w500"
TMDB_BACK  = "https://image.tmdb.org/t/p/w1280"


def tmdb_search(title, year, search_type, api_key):
    params = urllib.parse.urlencode({
        "api_key":        api_key,
        "query":          title,
        "year":           year or "",
        "include_adult":  "false",
        "language":       "en-US",
        "page":           1,
    })
    url = f"https://api.themoviedb.org/3/search/{search_type}?{params}"
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read().decode())
        results = data.get("results", [])
        if results:
            return results[0]
    except Exception as e:
        print(f"  TMDB error: {e}")
    # retry without year
    params2 = urllib.parse.urlencode({
        "api_key":       api_key,
        "query":         title,
        "include_adult": "false",
        "language":      "en-US",
        "page":          1,
    })
    url2 = f"https://api.themoviedb.org/3/search/{search_type}?{params2}"
    try:
        with urllib.request.urlopen(url2, timeout=10) as r:
            data = json.loads(r.read().decode())
        results = data.get("results", [])
        return results[0] if results else None
    except Exception as e:
        print(f"  TMDB retry error: {e}")
        return None


def fetch_media(title, year, category):
    api_key = os.environ.get("TMDB_API_KEY", "").strip()
    if not api_key:
        sys.exit("Set TMDB_API_KEY env variable first.")
    search_type = "tv" if category == "tv" else "movie"
    hit = tmdb_search(title, year, search_type, api_key)
    if not hit:
        return None
    poster   = hit.get("poster_path")
    backdrop = hit.get("backdrop_path")
    if not poster and not backdrop:
        return None
    media = {}
    if poster:
        media["poster"] = TMDB_IMG + poster
    if backdrop:
        media["backdrop"] = TMDB_BACK + backdrop
    return media


def extract_array(source):
    """Pull the JS array literal out of reviews.js and parse it as JSON."""
    match = re.search(r"const REVIEWS\s*=\s*(\[[\s\S]*?\]);", source)
    if not match:
        raise ValueError("Could not locate REVIEWS array in reviews.js")
    return json.loads(match.group(1))


def patch_reviews_js(source, review_id, media):
    """
    Locate the object block for review_id and inject a `media` field
    right after the closing `"images": [...]` line.
    """
    media_json = json.dumps(media, ensure_ascii=False)
    # Find the id field for this review
    id_pattern = re.compile(
        r'("id"\s*:\s*' + str(review_id) + r')',
    )
    m = id_pattern.search(source)
    if not m:
        return None

    # Find the next `"images": [...]` after this id
    img_pattern = re.compile(r'("images"\s*:\s*\[.*?\])', re.DOTALL)
    img_m = img_pattern.search(source, m.start())
    if not img_m:
        return None

    insert_pos = img_m.end()
    # Avoid double-inserting if media already present right after
    after_images = source[insert_pos:insert_pos + 60]
    if '"media"' in after_images:
        print(f"  id {review_id}: media already present, skipping")
        return source

    indent = "      "
    insertion = f",\n{indent}\"media\": {media_json}"
    return source[:insert_pos] + insertion + source[insert_pos:]


def main():
    source = REVIEWS_JS.read_text(encoding="utf-8")
    reviews = extract_array(source)

    missing = [r for r in reviews if not r.get("media")]
    if not missing:
        print("All reviews already have a media field.")
        return

    print(f"Found {len(missing)} review(s) missing a poster:")
    patched = source
    for r in missing:
        title    = r["title"]
        year     = r.get("year", "")
        category = r.get("category", "movie")
        print(f"  Fetching: {title} ({year}) [{category}]")
        media = fetch_media(title, year, category)
        if not media:
            print(f"  No poster found for {title}")
            continue
        print(f"  Got poster: {media.get('poster', '—')}")
        result = patch_reviews_js(patched, r["id"], media)
        if result:
            patched = result

    if patched != source:
        REVIEWS_JS.write_text(patched, encoding="utf-8")
        print("reviews.js updated.")
    else:
        print("No changes made.")


if __name__ == "__main__":
    main()
