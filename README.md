# Cascade · MPD midterm

The midterm presentation for MPD (23 Nov 2026) as a single web page: five scenes on a fixed 16:9 canvas, stepped through like slides.

## Run it

Serve the folder and open http://localhost:8765:

```sh
python3 serve.py
```

`serve.py` turns off browser caching, so a reload always shows the latest files (plain `python3 -m http.server` lets Chrome keep old copies of `app.js`). Opening `index.html` directly also works. After changing `app.js` or `style.css`, raise the `?v=` number on both in `index.html`, so browsers that cached the old files load the new ones.

Fonts load from Google Fonts; without a connection the page falls back to system fonts.

## Present

| Key | Action |
|---|---|
| → ↓ Space Enter PageDown, or click | next step |
| ← ↑ Backspace PageUp | previous step |
| F | fullscreen |
| P | play or pause the demo video |
| Home | back to the start |

A presentation clicker works too: it sends PageDown and PageUp. The address bar keeps the position (`#3.2` = scene 3, step 2), so a reload stays where you were.

## Scenes

1. **Vision:** Cascade, agents for every step of a hardware change.
2. **The chain:** non-conformity → root-cause analysis → change request → change implementation, with an agent on each handover. The last step brings in a magnifying glass that ticks off the finished steps and settles on the Downstream Agent; one more click dives into scene 3.
3. **Zoomed in:** one discontinued connector affects five departments; then one click per board round (redesign, test, approved) and the real case.
4. **Demo:** plays `assets/demo.mp4` if it exists, else shows a placeholder for switching to the live demo.
5. **What it changes:** three benefits, where we are, and what comes until the Design Fair.

## Demo recording

Put the screen recording at `assets/demo.mp4` (H.264). The demo scene picks it up on the next reload.
