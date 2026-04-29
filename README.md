# CS6024-Project3: The Big Bang Theory Dashboard

An interactive D3.js dashboard for exploring dialogue patterns in *The Big Bang Theory* across seasons, episodes, characters, locations, and co-presence networks.

## 1) Project Goals

The dashboard is designed to answer three analytical questions:

- Who speaks the most (overall and by season)?
- How does dialogue vary at episode level for a selected character?
- Where and with whom do characters interact across the series timeline?

The implementation emphasizes coordinated views, shared filters, and progressive detail:

- Start broad (overall character behavior)
- Narrow by season/episode
- Drill into character-level details and interactions

## 2) Tech Stack and Runtime

- Frontend only (no backend)
- `D3 v7` for all custom visualizations
- Plain HTML/CSS/JavaScript modules loaded in browser
- CSV data loaded client-side from `data/tbbt_cleaned_data.csv`

No package manager or build step is required.

## 3) Project Structure

Top-level directories:

- `js/` visualization and state modules
- `html/` section markup fragments loaded into `index.html`
- `css/` styles
- `data/` cleaned dialogue dataset
- `images/`, `audio/`, `gifs/` static assets

Primary entry points:

- `index.html` page shell and script order
- `js/app.js` initialization lifecycle
- `js/state.js` shared global state and data helpers

## 4) Application Lifecycle

The dashboard bootstraps in `js/app.js`:

1. Load section HTML via `loadVisualizationMarkup()`
2. Initialize theme song interaction (`audio.js`)
3. Load and preprocess CSV (`loadAndPrepareData()`)
4. Render initial views:
   - character gallery
   - overview
   - character importance charts
   - episode details (which also triggers downstream sections)

Resize behavior:

- `window.resize` triggers debounced re-render through `renderEpisodeCharts()`, which cascades into related sections.

## 5) Shared State Model

Global state lives in `js/state.js`:

- `globalState.data`: loaded CSV rows
- `globalState.selectedSeason`: `"overall"` or numeric season string
- `globalState.selectedEpisodeKeys`: `Set("season-episode")`
- `globalState.selectedCharacter`:
  - string for single-character focus, or
  - array for "all characters selected" / multi-selection contexts

Utility helpers:

- `selectAllCharacters()`
- `isAllCharactersSelected()`
- `cleanCharacterRows(data)`
- `buildCharacterStats(data)`

### Key design choice: shared cross-view state

All charts read/write the same `globalState` object. This enables coordinated filtering without event buses or external libraries.

## 6) Selected Visualizations and Rationale

### A) Character Importance (Bar Rankings)
File: `js/character-importance.js`

- Two horizontal bar charts:
  - episode appearances
  - total spoken word count
- Toggle view:
  - overall
  - season-specific

Why this design:

- Horizontal bars optimize label readability for character names.
- Side-by-side metrics separate presence (episodes) from verbosity (word count).
- Strong baseline comparison supports ranking tasks.

### B) Episode Details (Interactive Episode Bar Chart)
File: `js/episode-details.js`

- Selected character view by season
- Bars represent words spoken per episode
- Click-to-select episodes (multi-select)

Why this design:

- Bar chart supports precise per-episode comparison.
- Multi-select episodes enable focused downstream text analysis.
- Season dropdown narrows context while preserving global filter semantics.

### C) Character Words (Word Cloud + Phrase List)
File: `js/episode-details.js` (analysis section)

- Word cloud from selected scope (all chars, single char, or selected episodes)
- Recurring 3-gram phrase extraction and ranked display

Why this design:

- Word cloud provides fast thematic scanning.
- Phrase frequencies capture context lost in unigram-only views.
- Dynamic subtitles communicate active scope.

### D) Character Network (Force-Directed Graph)
File: `js/character-network.js`

- Nodes: main characters
- Links: scene co-occurrence frequency
- Edge width encodes relationship strength
- Node size reflects weighted connectivity

Why this design:

- Network layout conveys relational structure more naturally than matrices for small cast size.
- Edge weights and node radii make centrality and strong ties visually explicit.
- Clicking nodes reuses global character filtering.

### E) Locations Heatmap
File: `js/locations.js`

- Top N locations (rows) x characters (columns)
- Cell color/opacity encode dialogue count
- Character-column highlighting for focused comparison

Why this design:

- Heatmaps excel for dense location-character cross-tab patterns.
- Sorting by top locations reduces clutter and highlights meaningful settings.
- Column highlighting supports "where does this character speak most?" tasks.

### F) Character Dialogue Timeline (Stacked Area)
File: `js/character-dialogue-timeline.js`

- X-axis: episode timeline (`SxEy`)
- Y-axis: dialogue count
- Stacked areas for main characters
- Interactive legend with per-character toggles

Why this design:

- Stacked area emphasizes temporal composition shifts.
- Preserved global y-domain supports stable comparisons while filtering legend items.
- Legend interactivity supports selective trend inspection.

## 7) Interaction Design Choices

### Coordinated filtering

- Season filter affects importance, episode details, network, locations, and timeline.
- Episode selection affects scope-sensitive views (analysis + locations + timeline).
- Character selection propagates from gallery/bars/network/heatmap.

### Progressive disclosure

- Users first choose character context, then episode scope, then inspect words/network/locations/timeline.
- Clear buttons at multiple levels reduce filter lock-in and improve recoverability.

### Fallback-first rendering

- `load-html.js` provides fallback markup if fragment fetch fails.
- Charts gracefully render "no data" messages for empty filtered states.

## 8) Data Processing Notes

The loader (`loadAndPrepareData`) performs light preprocessing:

- `Season` and `Episode` cast to numeric
- `wordCount` computed from dialogue text token count

Filtering guardrails:

- `cleanCharacterRows()` excludes malformed/non-main character labels using:
  - membership in `MAIN_CHARACTERS`
  - length checks
  - bracketed alias filtering

## 9) Important Implementation Notes

- Script load order in `index.html` matters because modules share globals and functions.
- `renderEpisodeCharts()` acts as a central cascade point for downstream sections.
- `selectedEpisodeKeys` uses a `Set` for efficient toggling and membership checks.
- Character filter semantics support both single and all-character modes.

## 10) How to Run

Use any static file server from the project root (recommended, because HTML fragments are fetched):

- VS Code Live Server, or
- `python -m http.server`, or
- any equivalent local static server

Then open `index.html` via the server URL.

## 11) Extensibility Ideas

- Add brush/range interaction on timeline for episode interval filtering
- Add tooltips with richer metadata (scene descriptors, top words per episode)
- Add saved filter presets and URL-state persistence
- Add test harness for filter synchronization across modules


