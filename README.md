
# Project 3: The Big Bang Theory Dashboard

An interactive D3.js dashboard for exploring dialogue patterns in _The Big Bang Theory_ across seasons, episodes, characters, locations, and co-presence networks.

---

## Motivation

The goal of this project is to help people better understand how characters in the Big Bang Theory interact, speak and change along the course of the show. The show is popular and has many seasons, yet it is actually hard to answer simple questions by watching it casually. For example, it is not easy to remember who talks the most, which character interacts the most, or how characters evolve over various seasons.

This application solves that problem by turning the raw dialogue transcripts into interactive visualizations. Instead of reading thousands of lines of script, users can very quickly explore patterns using visualizations like charts and graphs. The dashboard allows users to compare characters based on how often they appear, how much they speak, and what kinds of words they use. It also shows how characters are connected to each other through shared scenes, and where most of the conversations take place.

Another important goal of this project is to make the data easy to explore. All parts of the application are interconnected, so when a user selects a character or a season, all the visualizations update automatically. This method makes it easier for users to see relationships between different aspects of the show without having to manually filter each chart. New viewers can understand who the main characters are and their roles in the show. On the other hand, a fan can explore deeper insights, like which episodes focus on a specific character or how dialogue patterns change over time.

---

## The Data

The data we used came from a public dataset on Kaggle called "[The Big Bang Theory Series Transcript](https://www.kaggle.com/datasets/mitramir5/the-big-bang-theory-series-transcript?resource=download)". This dataset contains dialogue from all 10 seasons of The Big Bang Theory. Each row in the dataset is one line of dialogue from one episode. It also includes information like the episode name, the character speaking, and the actual line they said.

The raw data, however, was not ready to be used right away. A lot of cleaning and processing had to be done before it could be used for visualization. The original file also included scene descriptions mixed in with dialogue, and the formatting was not consistent in some places.

We wrote a preprocessing script in Python (`data_preprocessing.py`) to fix this. The season number, episode number, and episode title were extracted from the episode name column using pattern matching. The next obstacle was scene information. The dataset uses rows labeled "Scene" to describe locations. We copied those location descriptions and applied them to all dialogue lines until the next scene appeared. Since scene rows are not actual dialogue, we removed them completely.

The dialogue text itself was cleaned meticulously. Stage directions like (laughing) or (sighs), as well as extra punctuation and formatting issues, were cleaned up so that the text became more consistent and easy to analyze.

Another important step was simplifying location names. The original dataset had long and inconsistent descriptions, so we mapped them to shorter, standardized names like "Sheldon & Leonard's Apartment" or "Caltech Cafeteria," which made it possible to build the location heatmap later.

After cleaning the main dataset, we also created two more preprocessing scripts:

- **`network_processing.py`**: Builds a dataset showing how often characters appear together. It calculates connections between characters using shared scenes and back-to-back dialogue.
- **`nlp_word_frequency.py`**: Processes the dialogue text to find the most common meaningful words for each character. It removes common stop words like "the" and "and" and focuses on more interesting, character-defining words.

After all preprocessing steps, the final cleaned dataset (`tbbt_cleaned_data.csv`) contains structured, consistent data that can be used directly by the application. All scripts are included in the project repository and the data processing can be reproduced if needed.

---

## Visualization Components

The application is built as a single-page dashboard. All visualizations are connected and sit on one scrolling page — the user does not need to switch tabs or open new pages.

### **Overview**

At the top of the page, an overview section introduces The Big Bang Theory, giving basic context for the rest of the dashboard. A small interactive feature here lets users play the show's theme song.

### **Character Gallery**

A grid of the main characters, each shown with an image. Hovering over a character reveals more details. Clicking a character selects them, causing the rest of the dashboard to update immediately and focus on that character. Clicking again clears the selection.

### **Character Importance**

Two bar charts displayed side by side: one showing how many episodes each character appears in, and one showing how many total words they speak. A dropdown menu lets users switch between individual seasons or view the whole series. When a character is selected elsewhere, their bar is highlighted here. Clicking a bar also selects that character and updates the rest of the page.

### **Episode Details**

A closer look at one character across episodes. Each bar represents a single episode, with taller bars indicating more dialogue. Users can click one or more episodes to create a focused selection, which filters the rest of the dashboard.

### **Word Cloud & Recurring Phrases**

Shows what the selected character (or episode selection) says most. Larger, more saturated words appear more frequently. Below the word cloud, a list of common three-word phrases shows patterns in how characters speak. Both views update dynamically based on character and episode selection.

### **Character Network**

The Character Network section contains two complementary views of the same co-occurrence data, displayed side by side.

The force-directed graph on the left shows each character as a circular node with their photo, connected by lines whose thickness reflects how often they share scenes. Users can drag nodes around to explore the layout, and edge labels show the exact shared scene count for each pair. Clicking a node selects that character and updates the rest of the dashboard.

The chord diagram on the right shows the same relationships in a circular layout. Each character has a colored arc around the outside of the circle, and curved ribbons between them represent their co-occurrence — thicker, more prominent ribbons indicate stronger connections. Hovering over a ribbon shows a tooltip with the exact shared scene count for that pair. Hovering over an outer arc highlights all of that character's ribbons and fades the rest, making it easy to see all of one character's relationships at once. Clicking an arc selects that character and filters the whole dashboard, just like clicking a node in the force graph.

### **Location Heatmap**

A matrix of locations (rows) by characters (columns), where each cell's color intensity reflects how many lines were spoken in that location by that character. Each location row also shows a small thumbnail image of that setting next to the row label. Hovering over a cell shows a rich tooltip with character photo, location name, location photo, and exact line count. Clicking a thumbnail opens a full-size lightbox image of that location. Clicking a character's column name highlights their full column for easier comparison and filters the rest of the dashboard. For cells large enough, the dialogue count is also printed directly inside the cell.

### **Character Dialogue Timeline**

A stacked area chart at the bottom of the page shows how much each character speaks across all episodes in chronological order. Each color represents a character, and users can toggle individual characters on or off by clicking their entry in the interactive legend above the chart. The legend shows each character's total dialogue count in parentheses, and a "Select All Characters" button makes it easy to reset after filtering. Hovering over an area shows a tooltip with the character name, episode label, and exact dialogue count for that point. The y-axis remains fixed to the full range even when characters are toggled off, keeping comparisons stable.

### **Coordinated Interactions**

All visualizations share a global state. Selecting a character (from the gallery, bars, network, or heatmap), choosing a season, or clicking episodes updates all relevant charts simultaneously. This makes the dashboard feel like one unified system rather than a set of independent charts.

---

## Design Sketches and Justifications

![CS6024 Project 3 Layout Sketch](<screenshots/CS6024 Project 3 Layout Sketch.jpg>)

The design of the dashboard was guided by the goal of supporting both casual exploration and deeper analysis. Each visualization type was chosen to best match the analytical task it supports.

### **Character Gallery**

The gallery uses a card-based grid with images to make character selection feel natural and familiar. Showing character photos rather than just names helps new viewers orient themselves quickly, lowering the barrier to entry.

### **Character Importance (Bar Charts)**

Horizontal bar charts were chosen to optimize label readability for character names. Displaying episode appearances and word count side by side separates two distinct notions of importance — being present in an episode versus being vocal — which often tell different stories. A strong shared baseline supports ranking comparisons at a glance.

### **Episode Details (Bar Chart)**

A per-episode bar chart supports precise comparison within a season. Multi-select episode interaction was designed to let users scope the downstream word analysis to specific moments — for example, comparing Sheldon's vocabulary in his most talkative episodes versus his quietest ones. A season dropdown narrows context without losing the global filter state.

### **Word Cloud & Recurring Phrases**

The word cloud provides fast thematic scanning, while the phrase list captures context that single-word frequencies miss. Together they give both a broad impression and specific linguistic patterns. Dynamic subtitles communicate the active scope so users always know what they are looking at.

### **Character Network (Force-Directed Graph + Chord Diagram)**

The Character Network section pairs two complementary views of the same data so users can switch between them based on what they want to read.

The force-directed graph communicates relational structure naturally for a cast of this size. Edge width encodes co-occurrence strength and node size reflects overall connectivity, making both central characters and strong ties visually explicit. Draggable nodes let users explore the layout interactively, and clicking a node reuses the same global character filter as the rest of the dashboard.

The chord diagram places all characters on a circle with arcs and ribbons scaled by shared scene count. This layout is particularly effective at showing the full pattern of all relationships simultaneously — at a glance users can see which characters are most connected (larger arcs) and which pairs share the strongest bonds (thicker ribbons). Hover highlighting focuses attention on one character's connections at a time. Together, the two views reinforce each other: the force graph is better for spatial exploration and exact pair values, while the chord diagram gives a holistic picture of the relationship structure.

### **Location Heatmap**

A heatmap is well-suited to the dense location-by-character cross-tab pattern. Sorting rows by the most active locations reduces clutter and surfaces meaningful settings immediately. Column highlighting supports the specific task of "where does this character spend most of their time?" without requiring the user to mentally scan across rows.

### **Dialogue Timeline (Stacked Area Chart)**

A stacked area chart emphasizes how the overall composition of dialogue shifts over time, not just individual totals. Preserving a stable y-axis scale while toggling characters keeps comparisons honest. The interactive legend supports selective trend inspection, letting users isolate one or two characters against the full series backdrop.

---

## What the Application Enables You to Discover

Using this dashboard, it becomes much easier to notice patterns that are hard to see just by watching the show. The data tells a clearer story when everything is put into visual form.

### **Sheldon's dominant presence**

One thing that stands out right away is how dominant Sheldon is. His bars in the importance charts are consistently much longer than everyone else's, and the difference is not small. Across seasons, he speaks significantly more than the other characters, which shows how central he is to the show.

![Character Importance chart showing Sheldon dominating](<screenshots/Character Importance chart showing Sheldon dominating.png>)

### **The apartment as the central setting**

The heatmap reveals that Sheldon and Leonard's apartment is the most active location by a wide margin. Almost every character speaks a lot there. The color intensity makes this obvious without requiring users to read exact numbers.

![Heatmap showing Sheldon & Leonard's apartment as the biggest location](<screenshots/Heatmap showing Sheldon & Leonard's apartment as the biggest location.png>)

### **Character relationships and evolving connections**

The network charts show the strongest connection between Sheldon and Leonard, with a noticeably thicker edge than most others. Switching between seasons also shows how characters like Amy and Bernadette become more connected over time, reflecting their growing roles in later seasons.

![Network graphs highlighting strong Sheldon–Leonard connection](<screenshots/Network graphs highlighting strong Sheldon–Leonard connection.png>)

### **Distinct character vocabularies**

The word cloud gives a different kind of insight. Each character has a distinct way of speaking — Sheldon's words relate more to science and logic, while Penny's connect to relationships and everyday life. These differences reveal personality through language in a way that is easy to overlook while casually watching.

![Sheldon Word Cloud](<screenshots/Sheldon Word Cloud.png>)
![Penny Word Cloud](<screenshots/Penny Word Cloud.png>)

### **Character-focused episodes**

The episode chart shows that some episodes stand out with much taller bars, meaning a character spoke significantly more in those episodes. Clicking those episodes then updates the word cloud to reveal the specific themes that defined them.

![Episode bar chart showing high spikes for selected episodes](<screenshots/Raj Episode bar chart showing high spikes for selected episodes.png>)

---

## Process

### **Libraries and Tools**
The application is built entirely on the frontend with no backend required. All visualizations are built using [D3.js v7](https://d3js.org/), which handles rendering, scaling, interaction, and transitions for every chart. The rest of the stack is plain HTML, CSS, and vanilla JavaScript with no package manager or build step.

Data preprocessing was done in Python prior to loading the application. The scripts rely on standard libraries for string processing, pattern matching, and CSV manipulation.

### **Code Structure**
The codebase is organized into separate directories by type:

- `js/` — all visualization and state modules. Each visualization has its own file (e.g., `character-importance.js`, `character-network.js`, `locations.js`, `character-dialogue-timeline.js`). Shared global state lives in `state.js`, and the initialization lifecycle is managed by `app.js`.
- `html/` — section markup fragments that are dynamically loaded into `index.html` at startup via `load-html.js`.
- `css/` — stylesheets, one per major section.
- `data/` — the cleaned CSV dataset and preprocessing scripts.
- `images/`, `audio/` — static assets.

The key architectural decision is a shared global state object (`globalState` in `state.js`) that all charts read from and write to. This eliminates the need for an event bus or external state management library — any interaction that updates `globalState` (selecting a character, choosing a season, clicking episodes) automatically propagates to all charts that depend on it. `renderEpisodeCharts()` acts as the central cascade point that triggers downstream re-renders.

### **How to Run**
The application requires a local static file server because HTML section fragments are fetched at runtime (opening `index.html` directly as a file will not work). Any of the following will work from the project root:

- **VS Code Live Server** extension (recommended for ease of use)
- `python -m http.server` then open `http://localhost:8000` in a browser
- Any equivalent local static server

Once the server is running, open `index.html` via the server URL and the full dashboard will load.

### **Code Repository**

https://github.com/taylorsenters/CS6024-Project3

---

## Demo Video

\[Insert 2–3 minute demo video or YouTube link here\]

---

## Who Did What

| Team Member | Contributions |
| :---- | :---- |
|**Taylor**|Data Preprocessing, Episode Details Chart, Character Word Cloud, Recurring Phrases, Character Network Chord Diagram, Where Characters Speak Heatmap, Page Layout and Responsiveness, Chart Interactivity, Documentation, Demo Video|
|**Aniket**|Page Theming, Theme Song Functionality, Character Gallery, Character Importance Charts, Character Word Cloud, Character Network Force Graph, Character Dialogue Timeline, Chart Interactivity, Documentation|
|**Steven**|Character Network Force Graph|
|**Vaish**|Data Preprocessing, Character Importance Charts, Documentation|

---

*CS 6024 | Project 3 | Spring 2026*
