# Quantistry Systems — Landing Page

A single-page marketing site for Quantistry Systems, built with static HTML, Tailwind CSS (via CDN), and vanilla JavaScript. No build step, no framework, no backend — designed to be hosted directly on GitHub Pages.

## File structure

```
.
├── index.html      # The entire site (markup, styles, and behavior)
├── systems.json    # Data for the trading systems lineup (fetched at runtime)
├── robots.txt      # Search engine crawl rules
├── sitemap.xml     # Sitemap for search engines
└── README.md
```

## Running locally

`index.html` loads `systems.json` with `fetch()`, which most browsers block on the `file://`
protocol (CORS). Opening `index.html` by double-clicking it will show an empty systems grid.
Instead, serve the folder over local HTTP:

```bash
# Python 3
python3 -m http.server 8000

# or Node
npx serve .
```

Then open `http://localhost:8000`.

## Editing the systems lineup

All system data lives in `systems.json` as an array of objects:

```json
{
  "name": "MAJORS",
  "slug": "majors",
  "description": "The single highest-volume, most-traded pairs in the universe.",
  "pairs": ["EURUSD", "USDJPY", "GBPUSD", "USDCHF", "AUDUSD", "EURGBP"],
  "stats": {
    "monthly": "4.52%",
    "profitFactor": "2.17",
    "winRate": "67.99%",
    "maxDrawdown": "33.88%"
  },
  "details": {
    "totalNetProfit": "$54,193.02",
    "sharpeRatio": "1.16",
    "...": "..."
  }
}
```

- `stats` populates the summary shown on each grid tile.
- `details` populates the full statistics shown in the modal when a tile is clicked.
- The first 6 systems in the array are shown by default; the rest appear behind the
  "Show all systems" button. Reorder the array to change what's featured up front.
- The hero "System Performance" widget references five systems by name
  (`heroSystemNames` near the bottom of `index.html`) — update that list if you rename or
  remove one of those systems.
- The equity curve in the hero widget is generated procedurically from each system's
  monthly return and max drawdown (there's no real month-by-month time series in the data).
  It's labeled as illustrative in the UI — if you later have real monthly equity data, swap
  `buildCurvePoints()` for a function that plots it directly.

## Tech notes

- **Styling**: Tailwind CSS is loaded from the CDN (`cdn.tailwindcss.com`) with an inline
  config extending the color palette and fonts. There is no `npm install` or build process.
- **Fonts**: Archivo (headings), Inter (body), IBM Plex Mono (data/labels), loaded from
  Google Fonts.
- **Accessibility**: the systems grid, modal, and tab controls use semantic roles
  (`role="list"`, `role="dialog"`, `role="tablist"`), keyboard interaction (Enter/Space to
  open a tile, Escape to close the modal, focus is moved to and returned from the modal),
  and respect `prefers-reduced-motion`.
- **SEO**: meta description, Open Graph and Twitter Card tags, canonical URL, `robots.txt`,
  `sitemap.xml`, and Organization/WebSite JSON-LD structured data are included. Update the
  placeholder URLs as described above for these to be effective.