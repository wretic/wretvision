# WRETVISION — RE Hub Visual Skill File
# `re-reviews/visual.md`
# Read this at the start of every session alongside MASTER.md and voice.md.
# This file is the visual brain. Follow it precisely. No deviations.

---

## CORE AESTHETIC DIRECTION

The RE hub is a **survival horror archive**. Every visual decision should feel like it was pulled from a police evidence locker, a government black site, or a decaying research facility. The UI is not a modern web app. It is a document. A case file. A mission briefing.

Keywords to design by: **degraded, atmospheric, authoritative, classified, analog horror, institutional decay.**

Never: clean, modern, minimal, friendly, gradient-heavy, card-shadow-heavy, rounded, playful.

---

## COLOR SYSTEM

All colors must use CSS variables. Never hardcode hex values in components.

```css
--bg-primary: #0a0a0a;          /* near-black page background */
--bg-secondary: #111111;        /* slightly lighter panels, rows */
--bg-card: #0d0d0d;             /* inventory cards, case file panels */
--bg-hover: #1a1a1a;            /* row hover states */

--accent-red: #8b0000;          /* primary red — WRETVISION brand, LIVE badge, borders */
--accent-red-bright: #cc0000;   /* bright red — pulsing LIVE dot, critical alerts */
--accent-gold: #b8860b;         /* gold — UPCOMING badge, film section accent */
--accent-green: #1a4a1a;        /* dark green — COMPLETED badge background */
--accent-green-bright: #00ff41; /* terminal green — progress bars, file counters */

--text-primary: #e8e0d0;        /* warm off-white — main body text */
--text-secondary: #888880;      /* muted — years, subtitles, metadata */
--text-accent: #cc0000;         /* red — game numbers, highlighted labels */
--text-terminal: #00ff41;       /* terminal green — counters, system readouts */
--text-gold: #b8860b;           /* gold — film titles, special labels */

--border-primary: #2a2a2a;      /* subtle row dividers */
--border-accent: #8b0000;       /* red borders on active/featured elements */
--border-terminal: #1a3a1a;     /* green border on terminal/readout elements */
```

---

## TYPOGRAPHY

### Font Stack
- **Display / Titles**: `'Special Elite', cursive` — typewriter feel, used for all page titles and section headers
- **UI / Labels / Badges**: `'Courier New', 'Courier', monospace` — institutional, classified-document feel
- **Body / Descriptions**: `'Georgia', serif` — readable, slightly aged

Import from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap" rel="stylesheet">
```

### Size Scale
```
Page title (h1):        2.8rem – 3.5rem, Special Elite, color: --text-primary
Section header (h2):    1.6rem – 2rem, Special Elite, color: --accent-red
Sub-header (h3):        1.2rem – 1.4rem, Courier New, uppercase, letter-spacing: 0.15em
Game title (row):       1rem – 1.1rem, Courier New, color: --text-primary
Year / metadata:        0.75rem – 0.85rem, Courier New, color: --text-secondary
Badge label:            0.65rem – 0.75rem, Courier New, uppercase, letter-spacing: 0.2em
Game number:            0.9rem, Courier New, color: --accent-red, font-weight: bold
```

### Rules
- ALL badge text is uppercase with letter-spacing: 0.15em minimum
- Game numbers always use leading zeros (01, 02... 19)
- Never use bold on body copy — weight comes from color and size contrast
- Avoid centered text except for page-level titles

---

## SPACING SYSTEM

```
Page horizontal padding:    24px each side (desktop), never more than 40px
Row padding (vertical):     18px – 24px top and bottom per entry row
Row padding (horizontal):   24px left, 24px right
Gap between rows:           0 — rows are separated by border-bottom only
Cover art thumbnail:        60px × 80px (portrait), object-fit: cover
Game number column:         48px fixed width
Status badge column:        140px fixed width
VOD icon zone:              180px fixed width, far right
Title zone:                 flex-grow: 1 — fills all remaining space
```

---

## COMPONENT ANATOMY

### Game Row (Playthrough Tracker)
```
[number 48px] [cover 60×80px] [title + year — flex-grow] [badge 140px] [vod-icons 180px]
```
- Row background: --bg-secondary
- Row hover: --bg-hover, transition 150ms
- Border-bottom: 1px solid --border-primary
- LIVE row gets: border-left: 3px solid --accent-red-bright, background slightly lighter

### Status Badges
```
UPCOMING:  background: transparent, border: 1px solid --accent-gold, color: --accent-gold
LIVE:      background: --accent-red, border: none, color: #fff, animation: pulse 1.5s infinite
COMPLETED: background: --accent-green, border: 1px solid --accent-green-bright, color: --accent-green-bright
```
- All badges: padding 4px 10px, font-size 0.65rem, uppercase, letter-spacing 0.2em, Courier New
- LIVE badge has a pulsing red dot (●) to its left, animated with opacity keyframes
- No border-radius on badges — sharp corners only, always

### Progress Bar (Files Completed)
```
Container: border: 1px solid --border-terminal, background: --bg-primary, padding: 12px 20px
Label:     color: --text-terminal, font: Courier New, font-size: 0.85rem, uppercase
Bar track: background: #0d1a0d, height: 6px, margin-top: 8px
Bar fill:  background: --accent-green-bright, height: 6px, transition: width 0.5s ease
```
Label format: `> FILES COMPLETED: X / 19`

### Inventory Cards (Review Hub)
- Background: --bg-card
- Border: 1px solid --border-primary
- Hover border: 1px solid --accent-red
- No border-radius — sharp corners always
- Cover image takes full card width, fixed height ~200px, object-fit: cover
- Title below image: Special Elite, 1rem, --text-primary
- Score badge: top-right corner overlay, --accent-red background

### Case File / Wanted File Pages
- Full-page dark background with subtle noise texture or grain overlay (CSS or SVG filter)
- Header image spans full width, max-height ~300px, object-fit: cover, darkened with overlay
- Content in a centered column, max-width: 900px
- Sections separated by: `border-top: 1px solid --border-primary`
- Section labels styled like document stamps: uppercase, Courier New, color: --text-secondary, letter-spacing: 0.3em

### Navigation Bar
- Background: rgba(0,0,0,0.95) or fully opaque --bg-primary
- Fixed or sticky top
- Links: Courier New, 0.75rem, uppercase, letter-spacing: 0.15em, color: --text-secondary
- Active link: color: --accent-red
- Hover: color: --text-primary, transition: 150ms
- No underlines. No background on hover. Color change only.
- WRETVISION logo: Special Elite or similar, color: --accent-red, top-left

---

## LAYOUT RULES

1. **Full width rows** — game list rows span full viewport width. No centered narrow column for the list itself.
2. **Max-width for reading content only** — case file text, review body, ranking descriptions cap at 900px centered. List rows never cap.
3. **No rounded corners anywhere** — border-radius: 0 on all interactive elements, cards, badges, buttons.
4. **No box shadows** — depth comes from borders and background color contrast, never shadows.
5. **No gradients on UI elements** — gradients only allowed on hero/header images as darkening overlays.
6. **Grid vs Flex** — use CSS Grid for card layouts (ranking grids, review grids). Use Flexbox for single-row layouts (nav, game rows, badge rows).
7. **Cover art always portrait** — never landscape thumbnails in list rows. 60×80px minimum.

---

## ANIMATION RULES

Minimal. Purposeful. Never decorative.

```
Allowed:
- LIVE badge pulse: opacity keyframes, 1.5s infinite
- Row hover: background-color transition, 150ms ease
- Progress bar fill: width transition, 0.5s ease
- Page load: single opacity fade-in on main content, 0.4s ease — nothing else

Never:
- Slide-in animations on scroll
- Staggered card reveals
- Parallax
- Floating elements
- Rotating anything
```

---

## THINGS CLAUDE CODE MUST NEVER DO

- Add border-radius to any element
- Use box-shadow anywhere
- Use purple, blue, or teal as accent colors
- Center the game list rows
- Use Inter, Roboto, Arial, or system-ui as fonts
- Add a gradient to a badge or button
- Use a red border-top or decorative line above buttons (known bug — always check WATCH LIVE button)
- Make the nav background transparent on scroll
- Use emoji anywhere in the UI
- Add loading spinners — use terminal-style text states instead (`> LOADING...`)
- Round any image corners
- Use white as a background color on any element

---

## FILE STRUCTURE REFERENCE

```
re-reviews/
├── index.html              ← Hub / landing page
├── playthrough.html        ← Playthrough tracker
├── rankings/
│   ├── index.html          ← Rankings hub
│   ├── villains.html
│   ├── protagonists.html
│   └── locations.html
├── wanted/
│   ├── case-re1.html
│   ├── case-re2.html
│   ... (up to case-re6.html)
├── films/
│   └── index.html
├── assets/
│   ├── ranking/
│   │   ├── villains/
│   │   ├── protagonists/
│   │   └── Locations/
│   └── [header images, case backgrounds]
├── MASTER.md               ← Project vision and game data
├── voice.md                ← Game review voice
├── movies-voice.md         ← Film review voice
└── visual.md               ← THIS FILE
```

---

## SESSION START CHECKLIST

Every Claude Code session working on re-reviews/ must:
1. Read `re-reviews/MASTER.md`
2. Read `re-reviews/voice.md`
3. Read `re-reviews/visual.md` (this file)
4. Read the specific HTML file being modified before touching it
5. Never assume — always read first, edit second

---
*Last updated: June 2026 — WRETVISION RE Hub v1*
