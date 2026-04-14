function renderCharacterCharts() {

    let div = document.getElementById("characterCharts");

    // Header row: title + clear button (only shown when a character is selected)
    let clearBtn = globalState.selectedCharacter
        ? `<button class="clear-btn" id="clearCharacterBtn">✕ Clear</button>`
        : "";

    div.innerHTML = `
        <div class="section-header-row">
            <h2 style="margin:0">Character Importance (Overall &amp; By Season)</h2>
            ${clearBtn}
        </div>
        <p class="chart-note">Episodes = number of unique episodes a character appears in. Speaking volume = total word count.</p>
        <div class="season-filter">
            <label for="seasonSelect">View:</label>
            <select id="seasonSelect"></select>
        </div>
        <div id="importanceContent"></div>
    `;

    if (globalState.selectedCharacter) {
        document.getElementById("clearCharacterBtn").onclick = () => {
            globalState.selectedCharacter = null;
            globalState.selectedEpisodeKeys = new Set();
            document.querySelectorAll(".character-card").forEach(c => c.classList.remove("selected"));
            renderCharacterCharts();
            renderEpisodeCharts();
        };
    }

    let filtered = cleanCharacterRows(globalState.data);
    let overallStats = buildCharacterStats(filtered);
    let seasons = Array.from(new Set(filtered.map(d => d.Season))).sort((a, b) => a - b);

    if (globalState.selectedSeason !== "overall" && !seasons.includes(+globalState.selectedSeason)) {
        globalState.selectedSeason = "overall";
    }

    let seasonSelect = document.getElementById("seasonSelect");
    seasonSelect.innerHTML = [`<option value="overall">Overall</option>`]
        .concat(seasons.map(s => `<option value="${s}">Season ${s}</option>`))
        .join("");
    seasonSelect.value = String(globalState.selectedSeason);
    seasonSelect.onchange = (e) => {
        globalState.selectedSeason = e.target.value;
        globalState.selectedEpisodeKeys = new Set();
        renderCharacterCharts();
        renderEpisodeCharts();
    };

    let importanceContent = document.getElementById("importanceContent");

    if (globalState.selectedSeason === "overall") {
        importanceContent.innerHTML = `
            <div class="importance-section">
                <h3>Overall</h3>
                <div class="importance-grid">
                    <div>
                        <h4>Episode Appearances</h4>
                        <div id="overallEpisodesChart"></div>
                    </div>
                    <div>
                        <h4>Word Count</h4>
                        <div id="overallWordsChart"></div>
                    </div>
                </div>
            </div>
        `;
        renderImportanceBars(document.getElementById("overallEpisodesChart"), overallStats, "episodes", "episodes");
        renderImportanceBars(document.getElementById("overallWordsChart"), overallStats, "words", "words");
    } else {
        let n = +globalState.selectedSeason;
        let seasonStats = buildCharacterStats(filtered.filter(d => d.Season === n));
        importanceContent.innerHTML = `
            <div class="importance-section">
                <h3>Season ${n}</h3>
                <div class="importance-grid">
                    <div>
                        <h4>Episode Appearances</h4>
                        <div id="seasonEpisodesChart"></div>
                    </div>
                    <div>
                        <h4>Word Count</h4>
                        <div id="seasonWordsChart"></div>
                    </div>
                </div>
            </div>
        `;
        renderImportanceBars(document.getElementById("seasonEpisodesChart"), seasonStats, "episodes", "episodes");
        renderImportanceBars(document.getElementById("seasonWordsChart"), seasonStats, "words", "words");
    }
}


function renderImportanceBars(container, stats, metricKey, metricLabel) {

    container.innerHTML = "";

    if (!stats.length) {
        container.innerHTML = "<p>No data available.</p>";
        return;
    }

    let maxValue = d3.max(stats, d => d[metricKey]) || 1;

    stats.forEach(stat => {
        let row = document.createElement("div");
        row.className = "importance-row";

        if (globalState.selectedCharacter === stat.character) {
            row.classList.add("selected");
        }

        row.title = "Click to see episode-level details";
        row.onclick = () => {
            globalState.selectedCharacter = stat.character;
            globalState.selectedEpisodeKeys = new Set();

            // Sync selected ring on gallery cards
            document.querySelectorAll(".character-card").forEach(c => {
                c.classList.toggle("selected", c.dataset.character === stat.character);
            });

            renderCharacterCharts();
            renderEpisodeCharts();
            document.getElementById("episodeCharts").scrollIntoView({ behavior: "smooth" });
        };

        let widthPercent = (stat[metricKey] / maxValue) * 100;
        row.innerHTML = `
            <div class="importance-row-label">${stat.character}</div>
            <div class="importance-row-track">
                <div class="importance-row-fill" style="width:${widthPercent}%"></div>
            </div>
            <div class="importance-row-value">${stat[metricKey]} ${metricLabel}</div>
        `;

        container.appendChild(row);
    });
}
