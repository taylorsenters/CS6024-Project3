// ─── Episode Bar Chart ──────────────────────────────────────────────────────

function renderEpisodeCharts() {

    let div = document.getElementById("episodeCharts");
    div.innerHTML = "<h2>Episode Details</h2>";

    if (!globalState.selectedCharacter) {
        div.innerHTML += "<p class='chart-note'>Click a character above to see their episode-level details.</p>";
        renderAnalysisSection();
        renderLocationsSection();
        return;
    }

    // Header: character name + clear button
    let header = document.createElement("div");
    header.className = "section-header-row";
    header.innerHTML = `
        <h3 style="margin:0">Selected: ${globalState.selectedCharacter}</h3>
        <button class="clear-btn" id="clearCharacterFromEpisodes">✕ Clear character</button>
    `;
    div.appendChild(header);

    let note = document.createElement("p");
    note.className = "chart-note";
    note.textContent = "Click bars to select episodes — the word cloud updates below. Click again to deselect.";
    div.appendChild(note);

    let allCharData = globalState.data.filter(d => d.Character === globalState.selectedCharacter);
    let seasons = Array.from(new Set(allCharData.map(d => d.Season))).sort((a, b) => a - b);

    // Season filter + episode clear button
    let controls = document.createElement("div");
    controls.className = "episode-controls-row";
    controls.innerHTML = `
        <div class="season-filter" style="margin:0">
            <label for="episodeSeasonSelect">Season:</label>
            <select id="episodeSeasonSelect"></select>
        </div>
        <button class="clear-btn" id="clearEpisodeSelection" style="display:none">✕ Clear selection</button>
    `;
    div.appendChild(controls);

    let barsPanel = document.createElement("div");
    barsPanel.id = "episodeBarsPanel";
    barsPanel.className = "episode-bars-panel";
    div.appendChild(barsPanel);

    // Wire clear-character button
    document.getElementById("clearCharacterFromEpisodes").onclick = () => {
        globalState.selectedCharacter = null;
        globalState.selectedEpisodeKeys = new Set();
        document.querySelectorAll(".character-card").forEach(c => c.classList.remove("selected"));
        renderCharacterCharts();
        renderEpisodeCharts();
    };

    // Season dropdown
    let episodeSeasonSelect = document.getElementById("episodeSeasonSelect");
    episodeSeasonSelect.innerHTML = [`<option value="overall">All Seasons</option>`]
        .concat(seasons.map(s => `<option value="${s}">Season ${s}</option>`))
        .join("");
    episodeSeasonSelect.value = String(globalState.selectedSeason);
    episodeSeasonSelect.onchange = (e) => {
        globalState.selectedSeason = e.target.value;
        globalState.selectedEpisodeKeys = new Set();
        renderCharacterCharts();
        renderEpisodeCharts();
    };

    // Build episode array
    let filteredData = globalState.selectedSeason === "overall"
        ? allCharData
        : allCharData.filter(d => d.Season === +globalState.selectedSeason);

    let grouped = d3.group(filteredData, d => d.Season + "-" + d.Episode);
    let episodeArray = Array.from(grouped).sort((a, b) => {
        let [s1, e1] = a[0].split("-").map(Number);
        let [s2, e2] = b[0].split("-").map(Number);
        return s1 !== s2 ? s1 - s2 : e1 - e2;
    });

    // Drop selected keys that don't exist in the current view
    globalState.selectedEpisodeKeys.forEach(key => {
        if (!episodeArray.some(([ep]) => ep === key)) {
            globalState.selectedEpisodeKeys.delete(key);
        }
    });

    // Show/hide episode clear button
    let clearEpBtn = document.getElementById("clearEpisodeSelection");
    if (globalState.selectedEpisodeKeys.size > 0) {
        clearEpBtn.style.display = "";
        clearEpBtn.onclick = () => {
            globalState.selectedEpisodeKeys = new Set();
            renderEpisodeCharts();
        };
    }

    renderEpisodeBars(document.getElementById("episodeBarsPanel"), episodeArray);

    renderAnalysisSection();
    renderLocationsSection();
}


// ─── Bar Chart Rendering ────────────────────────────────────────────────────

function renderEpisodeBars(container, episodeArray) {

    container.innerHTML = "";

    if (!episodeArray.length) {
        container.innerHTML = "<p class='chart-note'>No episodes found.</p>";
        return;
    }

    const panelW = container.getBoundingClientRect().width || 700;
    const totalW = panelW - 24;
    const margin = { top: 16, right: 16, bottom: 76, left: panelW < 400 ? 42 : 56 };
    const chartH = panelW < 500 ? 240 : 320;
    const innerH = chartH - margin.top - margin.bottom;
    const innerW = totalW - margin.left - margin.right;

    const wordCounts = episodeArray.map(([, vals]) => d3.sum(vals, d => d.wordCount));
    const labels = episodeArray.map(([ep]) => {
        let [s, e] = ep.split("-");
        return `S${s}E${String(e).padStart(2, "0")}`;
    });

    const x = d3.scaleBand().domain(labels).range([0, innerW]).padding(0.25);
    const y = d3.scaleLinear()
        .domain([0, d3.max(wordCounts) * 1.12])
        .range([innerH, 0])
        .nice();

    const labelEvery = Math.ceil(28 / x.bandwidth());

    const svg = d3.create("svg").attr("width", totalW).attr("height", chartH);
    const defs = svg.append("defs");

    const grad = defs.append("linearGradient")
        .attr("id", "epBarGrad").attr("x1","0").attr("y1","0").attr("x2","0").attr("y2","1");
    grad.append("stop").attr("offset","0%").attr("stop-color","#ffd766");
    grad.append("stop").attr("offset","100%").attr("stop-color","#ff9f40");

    const gradSel = defs.append("linearGradient")
        .attr("id", "epBarGradSel").attr("x1","0").attr("y1","0").attr("x2","0").attr("y2","1");
    gradSel.append("stop").attr("offset","0%").attr("stop-color","#ffe899");
    gradSel.append("stop").attr("offset","100%").attr("stop-color","#ffb84d");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g").attr("class","ep-grid")
        .selectAll("line").data(y.ticks(5)).join("line")
        .attr("x1",0).attr("x2",innerW)
        .attr("y1", d => y(d)).attr("y2", d => y(d))
        .attr("stroke","rgba(255,255,255,0.09)").attr("stroke-dasharray","4,3");

    g.append("g")
        .attr("transform",`translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickSize(0))
        .call(ax => {
            ax.select(".domain").attr("stroke","rgba(255,255,255,0.22)");
            ax.selectAll(".tick text")
                .attr("transform","rotate(-45)")
                .style("text-anchor","end")
                .style("fill","rgba(255,255,255,0.72)")
                .style("font-size","9px")
                .attr("dy","0.4em").attr("dx","-0.4em")
                .style("display", (_,i) => i % labelEvery === 0 ? null : "none");
        });

    g.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",d")).tickSize(0))
        .call(ax => {
            ax.select(".domain").attr("stroke","rgba(255,255,255,0.22)");
            ax.selectAll("text").style("fill","rgba(255,255,255,0.72)").style("font-size","9px");
        });

    g.append("text")
        .attr("transform","rotate(-90)").attr("x",-innerH/2).attr("y",-44)
        .attr("text-anchor","middle")
        .style("fill","rgba(255,255,255,0.55)").style("font-size","10px")
        .text("Words spoken");

    episodeArray.forEach(([ep, values], i) => {
        let words = wordCounts[i];
        let label = labels[i];
        let isSelected = globalState.selectedEpisodeKeys.has(ep);
        let [season, episode] = ep.split("-");

        const rect = g.append("rect")
            .attr("x", x(label))
            .attr("y", y(words))
            .attr("width", Math.max(x.bandwidth(), 1))
            .attr("height", Math.max(innerH - y(words), 2))
            .attr("fill", isSelected ? "url(#epBarGradSel)" : "url(#epBarGrad)")
            .attr("rx", Math.min(3, x.bandwidth() / 3))
            .attr("opacity", isSelected ? 1 : 0.68)
            .style("cursor", "pointer");

        if (isSelected) {
            rect.attr("stroke","rgba(255,255,255,0.8)").attr("stroke-width",1.5);
        }

        rect.on("mouseenter", function () {
            if (!globalState.selectedEpisodeKeys.has(ep)) d3.select(this).attr("opacity", 0.92);
        }).on("mouseleave", function () {
            if (!globalState.selectedEpisodeKeys.has(ep)) d3.select(this).attr("opacity", 0.68);
        }).on("click", () => {
            if (globalState.selectedEpisodeKeys.has(ep)) {
                globalState.selectedEpisodeKeys.delete(ep);
            } else {
                globalState.selectedEpisodeKeys.add(ep);
            }
            renderEpisodeCharts();
        });

        rect.append("title")
            .text(`Season ${season}, Episode ${episode}\n${words.toLocaleString()} words`);
    });

    container.appendChild(svg.node());
}


// ─── Analysis Sections (Word Cloud + Network) ───────────────────────────────

function renderAnalysisSection() {
    renderWordCloudSection();
    renderNetworkSection();
}

function renderWordCloudSection() {

    let div = document.getElementById("wordCloudSection");
    if (!div) return;

    div.innerHTML = `
        <h2>Character Words</h2>
        <h3 id="wordCloudTitle" style="margin:4px 0 2px; font-size:1rem; color:rgba(255,255,255,0.9)"></h3>
        <p class="panel-subtitle" id="wordCloudSubtitle"></p>
        <div id="wordCloudContent" class="word-cloud-content"></div>
        <div class="phrase-section">
            <h4 class="phrase-heading">Recurring Phrases</h4>
            <div id="phraseList" class="phrase-list"></div>
        </div>
    `;

    renderWordCloud();
}

function renderNetworkSection() {
    if (typeof renderCharacterNetworkSection === "function") {
        renderCharacterNetworkSection();
        return;
    }

    let div = document.getElementById("networkSection");
    if (!div) return;

    div.innerHTML = `
        <h2>Character Network</h2>
        <p class="panel-subtitle">Network component not loaded.</p>
    `;
}


// ─── Word Cloud ──────────────────────────────────────────────────────────────

function renderWordCloud() {

    let title = document.getElementById("wordCloudTitle");
    let subtitle = document.getElementById("wordCloudSubtitle");
    let container = document.getElementById("wordCloudContent");
    if (!title || !container) return;

    let rows, titleText, subtitleText;

    if (!globalState.selectedCharacter) {
        // No character selected — show all main characters combined
        rows = cleanCharacterRows(globalState.data);
        titleText = "Word Cloud — All Characters";
        subtitleText = "Combined dialogue across all main characters";

    } else if (globalState.selectedEpisodeKeys.size === 0) {
        // Character selected, no episodes — show full character overview
        let charData = globalState.data.filter(d => d.Character === globalState.selectedCharacter);
        rows = globalState.selectedSeason === "overall"
            ? charData
            : charData.filter(d => d.Season === +globalState.selectedSeason);

        titleText = `Word Cloud — ${globalState.selectedCharacter}`;
        subtitleText = globalState.selectedSeason === "overall"
            ? "All seasons"
            : `Season ${globalState.selectedSeason}`;

    } else {
        // One or more episodes selected — combine those rows only
        let charData = globalState.data.filter(d => d.Character === globalState.selectedCharacter);
        let grouped = d3.group(charData, d => d.Season + "-" + d.Episode);

        rows = [];
        globalState.selectedEpisodeKeys.forEach(key => {
            let vals = grouped.get(key);
            if (vals) rows = rows.concat(vals);
        });

        let count = globalState.selectedEpisodeKeys.size;
        titleText = `Word Cloud — ${globalState.selectedCharacter}`;
        subtitleText = count === 1
            ? (() => {
                let [s, e] = [...globalState.selectedEpisodeKeys][0].split("-");
                return `Season ${s}, Episode ${e}`;
            })()
            : `${count} episodes selected`;
    }

    title.textContent = titleText;
    if (subtitle) subtitle.textContent = subtitleText;
    container.innerHTML = "";

    let frequencies = buildWordFrequency(rows);

    if (!frequencies.length) {
        container.innerHTML = "<p class='word-cloud-placeholder'>No dialogue words available.</p>";
        renderPhrases([]);
        return;
    }

    let maxCount = frequencies[0].count;
    let minCount = frequencies[frequencies.length - 1].count;

    let colorScale = d3.scaleSequential()
        .domain([minCount, maxCount])
        .interpolator(d3.interpolateRgb("rgba(180,215,245,0.65)", "#ffd766"));

    frequencies.forEach(item => {
        let span = document.createElement("span");
        span.className = "word-chip";
        span.textContent = item.word;
        span.title = `${item.word}: ${item.count}`;
        span.style.fontSize = (11 + (item.count / maxCount) * 26).toFixed(1) + "px";
        span.style.color = colorScale(item.count);
        container.appendChild(span);
    });

    renderPhrases(rows);
}


// ─── Shared stop-word list ───────────────────────────────────────────────────
// Apostrophes are stripped from tokens before this check, so contractions are
// stored without them (don't → dont, i'm → im, etc.)

const STOP_WORDS = new Set([
    // articles / determiners
    "a","an","the","this","that","these","those","my","your","his","her","its",
    "our","their","whose",
    // pronouns
    "i","me","we","us","you","he","him","she","her","it","they","them",
    "myself","yourself","himself","herself","itself","ourselves","themselves",
    "who","whom","which","what","whoever","whatever","whichever",
    // prepositions / conjunctions
    "of","in","on","at","to","for","with","by","from","into","onto","upon",
    "over","under","above","below","behind","beside","between","among","through",
    "during","before","after","since","until","unless","while","about","around",
    "against","along","across","beyond","within","without","toward","towards",
    "and","but","or","nor","so","yet","both","either","neither","not","than","as",
    "if","though","although","because","since","while","when","where","whether",
    "however","therefore","thus","hence","also","either","both","even","only",
    // common verbs (base + simple past)
    "be","am","is","are","was","were","been","being",
    "have","has","had","do","does","did","get","got","go","went","come","came",
    "make","made","take","took","put","say","said","see","saw","know","knew",
    "think","thought","want","give","gave","look","seem","tell","told","feel","felt",
    "keep","kept","let","try","tried","ask","asked","call","called","turn","turned",
    "mean","means","meant","show","showed","need","needs","needed",
    "use","used","find","found","like","become","became","leave","left",
    // auxiliaries / modals
    "will","would","could","should","may","might","must","shall","can","need",
    // contractions (apostrophe stripped)
    "im","ive","id","ill",
    "youre","youve","youd","youll",
    "hes","shes","its","weve","wed","theyre","theyve","theyd","theyll",
    "thats","theres","heres","whats","whos","hows","lets",
    "dont","doesnt","didnt","cant","wont","isnt","arent",
    "wasnt","werent","havent","hasnt","hadnt","wouldnt","couldnt","shouldnt",
    "mightnt","mustnt","neednt",
    // filler / discourse
    "oh","okay","ok","yeah","yes","no","not","well","just","really","very",
    "actually","basically","literally","exactly","certainly","definitely",
    "probably","maybe","perhaps","anyway","right","sure","fine","great","hey",
    "hi","hello","sorry","please","thank","thanks","wow","hmm","uh","um",
    "here","there","then","now","still","already","again","yet","ever","never",
    "often","always","sometimes","once","twice","back","away","out","off","up",
    "down","so","too","more","most","less","least","much","many","few","all",
    "some","any","every","each","other","another","same","different","own",
    "just","even","also","else","together","instead","rather","quite","almost",
    // super-common TBBT filler that survives other filters
    "gonna","gotta","wanna","kinda","sorta","cause","cuz","till","til",
    "thing","things","something","anything","everything","nothing","stuff",
    "time","times","way","ways","bit","lot","lots","kind","sort","part",
    "place","people","person","man","men","woman","women","day","days",
    "year","years","life","world","point","fact","idea","problem","number",
    "mean","look","come","know","said","tell","told","want","going","got",
    "get","go","see","now","say","think","make","take","good","little","new",
    "first","last","long","great","big","high","small","old","next","early",
    "used","using"
]);


// ─── Word Frequency Builder ──────────────────────────────────────────────────

const APOSTROPHE_RE = /['\u2018\u2019\u02BC]/g;

function tokenize(text) {
    return (text || "")
        .toLowerCase()
        .replace(APOSTROPHE_RE, "")
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2);
}

function buildWordFrequency(rows) {

    let counts = new Map();

    rows.forEach(row => {
        tokenize(row.Dialogue)
            .filter(w => !STOP_WORDS.has(w))
            .forEach(w => counts.set(w, (counts.get(w) || 0) + 1));
    });

    return Array.from(counts.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 60);
}


// ─── Phrase Frequency Builder ────────────────────────────────────

function buildPhraseFrequency(rows) {

    const N = 3;
    const counts = new Map();
    // Require a majority of the phrase to be content words (not stop words).
    const isInteresting = words =>
        words.filter(w => !STOP_WORDS.has(w)).length >= Math.ceil(N / 2);

    rows.forEach(row => {
        // Split on sentence-ending punctuation so phrases don't cross sentences
        let sentences = (row.Dialogue || "")
            .toLowerCase()
            .split(/[.!?,;:]+/);

        sentences.forEach(sentence => {
            let words = sentence
                .replace(APOSTROPHE_RE, "")
                .replace(/[^a-z\s]/g, " ")
                .split(/\s+/)
                .filter(w => w.length > 0);

            for (let i = 0; i <= words.length - N; i++) {
                let phrase = words.slice(i, i + N);
                if (!isInteresting(phrase)) continue;
                let key = phrase.join(" ");
                counts.set(key, (counts.get(key) || 0) + 1);
            }
        });
    });

    // Min frequency scales with corpus size so single-episode view still shows results
    let minFreq = rows.length > 300 ? 4 : 2;

    return Array.from(counts.entries())
        .map(([phrase, count]) => ({ phrase, count }))
        .filter(d => d.count >= minFreq)
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);
}


// ─── Phrase Renderer ─────────────────────────────────────────────────────────

function renderPhrases(rows) {

    let container = document.getElementById("phraseList");
    if (!container) return;

    container.innerHTML = "";

    if (!rows.length) {
        container.innerHTML = "<p class='word-cloud-placeholder' style='font-size:0.82rem'>No data.</p>";
        return;
    }

    let phrases = buildPhraseFrequency(rows);

    if (!phrases.length) {
        container.innerHTML = "<p class='word-cloud-placeholder' style='font-size:0.82rem'>No recurring phrases found.</p>";
        return;
    }

    let maxCount = phrases[0].count;

    phrases.forEach(({ phrase, count }) => {
        let item = document.createElement("div");
        item.className = "phrase-item";
        item.title = `Appears ${count} time${count !== 1 ? "s" : ""}`;

        let fill = (count / maxCount * 100).toFixed(1);

        item.innerHTML = `
            <span class="phrase-text">"${phrase}"</span>
            <div class="phrase-bar-wrap">
                <div class="phrase-bar-fill" style="width:${fill}%"></div>
            </div>
            <span class="phrase-count">×${count}</span>
        `;
        container.appendChild(item);
    });
}
