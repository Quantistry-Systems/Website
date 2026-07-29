# Quantistry Systems — Landing Page

A single-page marketing site for Quantistry Systems, built with Vite, Tailwind CSS (v4), and vanilla JavaScript. Features an automated build process for CSS purging, asset hashing, and JavaScript minification, alongside an integrated Web3Forms contact modal.

## File structure

```text
.
├── public/             # Static assets copied directly to dist/ at build time
│   ├── systems.json    # Data for the trading systems lineup (fetched at runtime)
│   ├── robots.txt      # Search engine crawl rules
│   └── sitemap.xml     # Sitemap for search engines
├── src/
│   ├── main.js         # Application logic, system renderers, and Web3Forms contact form handler
│   └── style.css       # Tailwind v4 import, theme variables (@theme), and custom utilities
├── index.html          # Main HTML markup and modal definitions
├── vite.config.js      # Vite build setup with @tailwindcss/vite plugin
├── package.json        # Project dependencies and build scripts
├── .gitignore          # Excludes node_modules and dist/ from git
└── README.md
```

## Running locally

### 1. Install dependencies

Ensure you have Node.js installed, then install the project dependencies:

```bash
npm install
```

### 2. Start the development server

Run the Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Building for production

To compile, bundle, and minify the project for deployment:

```bash
npm run build
```

Vite will purge unused CSS, minify JavaScript, generate content-hashed filenames for caching, and output all production-ready files into a `/dist` directory.

### Preview the production build locally

To test the generated output from `/dist` before uploading to your server:

```bash
npm run preview
```

### Deployment

Deploy the contents of the `/dist` directory to your web server (GitHub Pages, Netlify, Vercel, Cloudflare Pages, SFTP, etc.).

## Editing the systems lineup

All system data lives in `public/systems.json` as an array of objects:

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

* `stats` populates the summary shown on each grid tile.
* `details` populates the full statistics shown in the modal when a tile is clicked.
* The first 6 systems in the array are shown by default; the rest appear behind the "Show all systems" button. Reorder the array to change what's featured up front.
* The hero "System Performance" widget references five systems by name (`heroSystemNames` array in `src/main.js`) — update that array if you rename or remove any of those systems.
* The equity curve in the hero widget is generated procedurally from each system's monthly return and max drawdown. It's labeled as illustrative in the UI — if you later have real monthly equity data, swap `buildCurvePoints()` in `src/main.js` for a function that plots it directly.

## Contact form (Web3Forms)

The site uses Web3Forms for email submissions inside the Contact Modal.

* The submission logic and success/error UI states are handled asynchronously in `src/main.js`.
* The `access_key` hidden input field inside `#contact-form` in `index.html` controls where emails are delivered. Update this key if you change Web3Forms accounts.
* Any link with `href="#contact"` will automatically trigger the contact modal to open.

## Tech notes

* **Build Tool**: Powered by Vite for fast development and optimized asset bundling.
* **Styling**: Built with Tailwind CSS v4 via `@tailwindcss/vite`. Theme colors, typography, and custom variables are defined directly inside `src/style.css` using the `@theme` directive.
* **Fonts**: Archivo (headings), Inter (body), IBM Plex Mono (data/labels), loaded via Google Fonts in `index.html`.
* **Accessibility**: Modals, systems grid, and tab controls utilize semantic roles (`role="dialog"`, `role="list"`, `role="tablist"`), proper keyboard navigation (Enter/Space to open, Escape to dismiss, focus trapping/restoration), and respect `prefers-reduced-motion`.
* **SEO**: Includes meta descriptions, Open Graph & Twitter Card tags, canonical URLs, `robots.txt`, `sitemap.xml`, and structured data (JSON-LD).