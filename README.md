# BrickReturn™
**A financing model that turns bulk-purchase arbitrage and market yield into monthly EMI rebates for Indian homebuyers.**

## What This Is

BrickReturn™ is a static web app that explains and stress-tests an alternative residential financing structure for India. It models how aggregating buyers into a wholesale block, capturing developer bulk discounts, and recycling a market-yield corpus can refund up to 52% of a homebuyer's EMI by year 12 — without government subsidies. The site is built for anyone curious about the thesis (homebuyers, investors, developers, or reviewers), and it pairs a marketing explainer with a real, interactive calculator backed by 263 catalogued projects across 18 cities.

## Key Features

- **Year-by-year finance engine** — `calcBrickReturn()` simulates bulk discount, corpus markup, investor fixed-deposit compounding (8.0–8.5% CAGR), buyer yield capped at 10%, and annual rebates equal to 25% of the buyer's yield; supports Method 1 vs Method 2 buyer-notional accounting and loss-year stress scenarios
- **263-project property catalog** — searchable, filterable grid (city, Live/Completed status, budget band, text search) with paginated load-more; each card shows standard EMI vs BrickReturn year-12 net payment and links to a full breakdown
- **Interactive property calculator** — six live sliders (bulk discount 0–25%, corpus markup 20–40%, yield 6–15%, investor coupon 8–8.5%, loan rate 6.5–12%, tenure 10–30 yrs) with per-year custom yield inputs, Stress/Boom/Mixed presets, and a dynamically constrained minimum profitable yield
- **Live SVG visualizations** — four charts on the property page (EMI relief line, annual rebate bars, corpus/investor/buyer compounding, total-cost comparison) plus a homepage EMI chart, all rendered from the same calculation engine with hover tooltips
- **Full mechanism explainer** — dedicated How It Works page with money-flow diagram, four-player breakdown, six-step model, math sanity checks, risk safeguards, what-if scenarios accordion, and an end-to-end worked example
- **Responsive marketing site** — scroll-reveal animations, animated hero stat count-ups, FAQ accordion, mobile hamburger navigation, and side-by-side Standard vs BrickReturn comparison cards showing cumulative rebate and net total paid

## Tech Stack

| Layer | Technologies |
|---|---|
| **Markup** | HTML5 |
| **Styling** | CSS3, Google Fonts (Playfair Display, Inter) |
| **Logic** | Vanilla JavaScript (ES6+) — `script.js`, `property.js` |
| **Data** | JSON (`properties.json`) |
| **Charts** | Inline SVG (no chart library) |
| **Local server** | Python 3 `http.server` |
| **Deployment** | GitHub Pages (static hosting) |

No npm dependencies, no build step, no backend.

## How to Run

BrickReturn must be served over HTTP — `properties.json` is loaded via `fetch()`, which fails on `file://` in most browsers.

```bash
# Clone the repository
git clone https://github.com/kartikeyjaiswal42-sudo/BrickReturn.git
cd BrickReturn

# Start a local static server (Python 3)
python3 -m http.server 8090
```

Open **http://localhost:8090** in your browser.

**Pages:**
- `/` or `index.html` — homepage with catalog and model overview
- `how-it-works.html` — full mechanism explainer
- `property.html?id=<project-id>` — per-property calculator (e.g. `property.html?id=mum-006`)

Deploy to any static host (GitHub Pages, Netlify, Vercel, Render) — push the repo root as-is.

## Project Structure

```
BrickReturn/
├── index.html          # Homepage — hero, problem, model, math, property grid, FAQ, CTA
├── how-it-works.html   # Standalone 8-section mechanism explainer with money-flow diagram
├── property.html       # Property detail page — sliders, comparison cards, charts, simulation table
├── script.js           # Core finance engine (calcBrickReturn), catalog loader/filters, EMI chart, nav
├── property.js         # Detail-page logic — sliders, per-year yields, SVG charts, worked example
├── style.css           # Full site styling (cream/slate/terracotta theme, responsive layout)
├── properties.json     # 263 residential projects across 18 cities (117 developers)
└── .gitignore
```

**`calcBrickReturn(priceCr, opts)`** in `script.js` is the single source of truth for every number on the site — homepage stats, catalog cards, property breakdowns, and charts all call this function.

## Why I Built This

I'm a mechanical engineering student who thinks in systems — and India's residential finance system felt like one with a structural flaw baked in. On a ₹1 crore home, a buyer pays roughly ₹1.64 crore over 12 years while their equity earns a fraction of what a basic index fund would return. The bulk discount developers already give to wholesale buyers was always there; individual homebuyers just never saw it.

I wrote the original thesis on my blog ([India's Homebuyers Pay Too Much](https://socialresults.blogspot.com/2026/05/indias-homebuyers-pay-too-much.html)) and then built this site with AI-assisted development to make the model tangible — not as a pitch deck, but as something you can actually stress-test. Drag the yield slider down. Set year 4 to −2.5%. Watch BrickReturn's residual stake go negative while the investor still compounds at 8.5%. That's the kind of rigour I wanted before anyone took the idea seriously. The site is explicitly in an **ideation and academic review stage** — it's a working prototype of the math, not a live financial product.

## Live Demo

🔗 Live Demo: [Add link here]

*(Deployed at https://kartikeyjaiswal42-sudo.github.io/BrickReturn/)*

## Screenshots

📸 Screenshots: [Add screenshots here]
