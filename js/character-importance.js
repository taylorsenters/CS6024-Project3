function renderCharacterCharts() {

    let div = document.getElementById("characterCharts");
    div.innerHTML = `
        <h2>Character Importance (Overall & By Season)</h2>
        <p class="chart-note">Episodes = number of unique episodes a character appears in. Speaking volume = total word count from dialogue.</p>
        <div class="season-filter">
            <label for="seasonSelect">View:</label>
            <select id="seasonSelect"></select>
        </div>
        <div id="importanceContent"></div>
    `;

    let filtered = cleanCharacterRows(globalState.data);
    let overallStats = buildCharacterStats(filtered);

    let seasons = Array.from(new Set(filtered.map(d => d.Season))).sort((a, b) => a - b);

    if (!globalState.selectedSeason) {
        globalState.selectedSeason = "overall";
    }

    if (
        globalState.selectedSeason !== "overall" &&
        !seasons.includes(+globalState.selectedSeason)
    ) {
        globalState.selectedSeason = "overall";
    }

    let seasonSelect = document.getElementById("seasonSelect");
    seasonSelect.innerHTML = [`<option value="overall">Overall</option>`]
        .concat(seasons.map(season => `<option value="${season}">Season ${season}</option>`))
        .join("");

    seasonSelect.value = String(globalState.selectedSeason);
    seasonSelect.onchange = (event) => {
        globalState.selectedSeason = event.target.value;
        renderCharacterCharts();
    };

    let importanceContent = document.getElementById("importanceContent");

    if (globalState.selectedSeason === "overall") {
        importanceContent.innerHTML = `
            <div class="importance-section">
                <h3>Overall</h3>
                <div class="importance-grid">
                    <div>
                        <h4>Episode Appearances (Overall)</h4>
                        <div id="overallEpisodesChart"></div>
                    </div>
                    <div>
                        <h4>Word Count (Overall)</h4>
                        <div id="overallWordsChart"></div>
                    </div>
                </div>
            </div>
        `;

        renderImportanceBars(
            document.getElementById("overallEpisodesChart"),
            overallStats,
            "episodes",
            "episodes"
        );
        renderImportanceBars(
            document.getElementById("overallWordsChart"),
            overallStats,
            "words",
            "words"
        );
    } else {
        let selectedSeasonNumber = +globalState.selectedSeason;
        let seasonStats = buildCharacterStats(
            filtered.filter(d => d.Season === selectedSeasonNumber)
        );

        importanceContent.innerHTML = `
            <div class="importance-section">
                <h3>Season ${selectedSeasonNumber}</h3>
                <div class="importance-grid">
                    <div>
                        <h4>Episode Appearances (Season ${selectedSeasonNumber})</h4>
                        <div id="seasonEpisodesChart"></div>
                    </div>
                    <div>
                        <h4>Word Count (Season ${selectedSeasonNumber})</h4>
                        <div id="seasonWordsChart"></div>
                    </div>
                </div>
            </div>
        `;

        renderImportanceBars(
            document.getElementById("seasonEpisodesChart"),
            seasonStats,
            "episodes",
            "episodes"
        );
        renderImportanceBars(
            document.getElementById("seasonWordsChart"),
            seasonStats,
            "words",
            "words"
        );
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
            renderEpisodeCharts();
            renderCharacterCharts();

            document.getElementById("episodeCharts").scrollIntoView({
                behavior: "smooth"
            });
        };

        let widthPercent = (stat[metricKey] / maxValue) * 100;

        row.innerHTML = `
            <div class="importance-row-label">${stat.character}</div>
            <div class="importance-row-track">
                <div class="importance-row-fill" style="width: ${widthPercent}%;"></div>
            </div>
            <div class="importance-row-value">${stat[metricKey]} ${metricLabel}</div>
        `;

        container.appendChild(row);
    });
}
