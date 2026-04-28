function renderDialogueTimeline(container) {

    if (!container) return;

    let allCharacterRows = cleanCharacterRows(globalState.data);
    let filteredRows = allCharacterRows;

    if (globalState.selectedSeason !== "overall") {
        filteredRows = filteredRows.filter(d => d.Season === +globalState.selectedSeason);
    }
    if (globalState.selectedEpisodeKeys.size > 0) {
        filteredRows = filteredRows.filter(d => globalState.selectedEpisodeKeys.has(`${d.Season}-${d.Episode}`));
    }

    if (!filteredRows.length) {
        container.innerHTML = `
            <h2 style="margin:14px 0 6px">Character Dialogue Timeline</h2>
            <p class="chart-note">No dialogue timeline data available for the current filter.</p>
        `;
        return;
    }

    let episodes = d3.rollups(
        filteredRows,
        rows => rows.length,
        d => d.Season + "-" + d.Episode
    ).map(([key]) => {
        let [season, episode] = key.split("-").map(Number);
        return { key, season, episode, label: `S${season}E${String(episode).padStart(2, "0")}` };
    }).sort((a, b) => (a.season - b.season) || (a.episode - b.episode));

    let episodeSet = new Set(episodes.map(d => d.key));
    let perCharacterCounts = new Map();
    [...MAIN_CHARACTERS].forEach(character => {
        perCharacterCounts.set(character, new Map());
    });

    filteredRows.forEach(row => {
        let key = `${row.Season}-${row.Episode}`;
        if (!episodeSet.has(key)) return;
        let map = perCharacterCounts.get(row.Character);
        if (!map) return;
        map.set(key, (map.get(key) || 0) + 1);
    });

    let stackedRows = episodes.map(ep => {
        let row = { key: ep.key, label: ep.label };
        [...MAIN_CHARACTERS].forEach(character => {
            row[character] = (perCharacterCounts.get(character)?.get(ep.key)) || 0;
        });
        return row;
    });

    let totalsByCharacter = d3.rollups(
        filteredRows,
        rows => rows.length,
        d => d.Character
    );
    let totalsLookup = new Map(totalsByCharacter);

    container.innerHTML = `
        <div class="section-header-row" style="margin-top:14px">
            <h2 style="margin:0">Character Dialogue Timeline</h2>
        </div>
        <p class="chart-note">Stacked area chart of dialogue counts across season/episode timeline for all main characters (uses current filters).</p>
        <div id="dialogueTimelineChart" class="episode-bars-panel" style="position:relative"></div>
    `;

    const panel = document.getElementById("dialogueTimelineChart");
    const panelW = panel.getBoundingClientRect().width || 900;
    const characters = [...MAIN_CHARACTERS];

    // Legend sizing — compute before margin so margin.top can fit the legend
    const LEGEND_ITEM_W = 185;
    const fixedLeft = 78, fixedRight = 18, fixedBottom = 66;
    const chartWidth = panelW - fixedLeft - fixedRight;
    const legendCols = Math.max(1, Math.min(characters.length, Math.floor(chartWidth / LEGEND_ITEM_W)));
    const legendItemRows = Math.ceil(characters.length / legendCols);
    const LEGEND_TOP_PAD = 8;
    const legendAreaH = (legendItemRows + 1) * 22 + LEGEND_TOP_PAD; // +1 row for Select All

    const margin = { top: legendAreaH, right: fixedRight, bottom: fixedBottom, left: fixedLeft };
    const width = chartWidth;
    const innerH = 334; // keep chart area constant regardless of legend size
    const height = innerH + margin.top + margin.bottom;
    const xTickStep = Math.max(1, Math.ceil(stackedRows.length / Math.max(7, Math.floor(width / 90))));
    let selectedCharacters = [];

    if (Array.isArray(globalState.selectedCharacter)) {
        selectedCharacters = globalState.selectedCharacter.filter(character => MAIN_CHARACTERS.has(character));
        if (selectedCharacters.length !== globalState.selectedCharacter.length) {
            globalState.selectedCharacter = selectedCharacters;
        }
    } else if (typeof globalState.selectedCharacter === "string" && MAIN_CHARACTERS.has(globalState.selectedCharacter)) {
        selectedCharacters = [globalState.selectedCharacter];
    } else {
        selectAllCharacters();
        selectedCharacters = getAllCharacterNames();
    }

    const legendState = characters.map(character => ({
        character,
        active: selectedCharacters.length === 0 ? true : selectedCharacters.includes(character),
        total: totalsLookup.get(character) || 0
    }));

    let x = d3.scaleLinear()
        .domain([0, stackedRows.length - 1])
        .range([0, width]);

    let stack = d3.stack().keys(characters);
    let series = stack(stackedRows);
    let maxY = d3.max(series, s => d3.max(s, d => d[1])) || 1;

    let y = d3.scaleLinear()
        .domain([0, maxY])
        .nice()
        .range([innerH, 0]);

    let color = d3.scaleOrdinal()
        .domain([...MAIN_CHARACTERS])
        .range(["#ffd766", "#89c7ff", "#ff9f40", "#7ef0c3", "#c58cff", "#ff7fa1", "#f97aff"]);

    let svg = d3.create("svg")
        .attr("width", panelW)
        .attr("height", height);

    let g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let gridLayer = g.append("g")
        .attr("class", "ep-grid")
        .selectAll("line")
        .data(y.ticks(6))
        .join("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => y(d))
        .attr("y2", d => y(d))
        .attr("stroke", "rgba(255,255,255,0.1)")
        .attr("stroke-dasharray", "4,3");

    let area = d3.area()
        .x((d, i) => x(i))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveMonotoneX);

    let tooltip = d3.select(panel)
        .append("div")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("padding", "6px 8px")
        .style("font-size", "11px")
        .style("line-height", "1.3")
        .style("color", "#fff")
        .style("background", "rgba(8, 19, 31, 0.96)")
        .style("border", "1px solid rgba(255,255,255,0.24)")
        .style("border-radius", "8px")
        .style("box-shadow", "0 6px 18px rgba(0,0,0,0.28)")
        .style("opacity", 0);

    let areaLayer = g.append("g");

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(
            d3.axisBottom(x)
                .tickValues(d3.range(0, stackedRows.length, xTickStep))
                .tickFormat(i => stackedRows[i] ? stackedRows[i].label : "")
        )
        .call(ax => {
            ax.select(".domain").attr("stroke", "rgba(255,255,255,0.25)");
            ax.selectAll("text")
                .style("fill", "rgba(255,255,255,0.75)")
                .style("font-size", "10px")
                .attr("transform", "rotate(-35)")
                .style("text-anchor", "end");
        });

    let yAxisLayer = g.append("g")
        .call(d3.axisLeft(y).ticks(6))
        .call(ax => {
            ax.select(".domain").attr("stroke", "rgba(255,255,255,0.25)");
            ax.selectAll("text")
                .style("fill", "rgba(255,255,255,0.88)")
                .style("font-size", "11px")
                .style("font-weight", "600");
        });

    g.append("text")
        .attr("x", width / 2)
        .attr("y", innerH + 52)
        .attr("text-anchor", "middle")
        .style("fill", "rgba(255,255,255,0.7)")
        .style("font-size", "10px")
        .text("Season / Episode Timeline");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2)
        .attr("y", -58)
        .attr("text-anchor", "middle")
        .style("fill", "rgba(255,255,255,0.9)")
        .style("font-size", "12px")
        .style("font-weight", "700")
        .text("No. of dialogues");

    // Legend sits above the chart — positioned so its top starts LEGEND_TOP_PAD px from SVG top
    let legend = g.append("g").attr("transform", `translate(0,${-(legendAreaH - LEGEND_TOP_PAD)})`);
    let legendItems = legend.selectAll("g.legend-item")
        .data(legendState, d => d.character)
        .join("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => {
            let col = i % legendCols;
            let row = Math.floor(i / legendCols);
            return `translate(${col * LEGEND_ITEM_W},${row * 22})`;
        })
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            event.stopPropagation();
            toggleLegendCharacter(d.character);
        });

    legendItems.each(function (d) {
        let item = d3.select(this);
        item.append("rect")
            .attr("class", "legend-hitbox")
            .attr("x", -8)
            .attr("y", -6)
            .attr("width", 178)
            .attr("height", 22)
            .attr("fill", "transparent");
        item.append("rect")
            .attr("class", "legend-bg")
            .attr("x", -4)
            .attr("y", -3)
            .attr("width", 170)
            .attr("height", 18)
            .attr("rx", 6)
            .attr("fill", "rgba(7, 18, 29, 0.62)")
            .attr("stroke", "rgba(255,255,255,0.16)");
        item.append("rect")
            .attr("class", "legend-swatch")
            .attr("width", 10)
            .attr("height", 10)
            .attr("rx", 2)
            .attr("fill", color(d.character));
        item.append("text")
            .attr("class", "legend-text")
            .attr("x", 14)
            .attr("y", 9)
            .style("fill", "rgba(255,255,255,0.98)")
            .style("font-size", "11px")
            .style("font-weight", "700")
            .text(`${d.character} (${d.total.toLocaleString()})`);
    });

    // "Select All" button — own dedicated row below character items
    const selectAllY = legendItemRows * 22;
    const legendControl = legend.append("g")
        .attr("transform", `translate(0,${selectAllY})`)
        .style("cursor", "pointer")
        .on("click", (event) => {
            event.stopPropagation();
            setAllLegendCharacters(true);
        });

    legendControl.append("rect")
        .attr("class", "legend-selectall-hitbox")
        .attr("x", -2).attr("y", -4)
        .attr("width", 164).attr("height", 20)
        .attr("fill", "transparent");

    legendControl.append("rect")
        .attr("class", "legend-selectall-bg")
        .attr("x", 0).attr("y", -3)
        .attr("width", 160).attr("height", 18)
        .attr("rx", 6)
        .attr("fill", "rgba(10, 24, 38, 0.84)")
        .attr("stroke", "rgba(255, 214, 102, 0.65)");

    legendControl.append("text")
        .attr("class", "legend-selectall-text")
        .attr("x", 10).attr("y", 10)
        .style("fill", "#ffd766")
        .style("font-size", "11px")
        .style("font-weight", "700")
        .text("Select All Characters");

    function getFilteredCharacters() {
        if (typeof globalState.selectedCharacter === "string" && MAIN_CHARACTERS.has(globalState.selectedCharacter)) {
            return [globalState.selectedCharacter];
        } else if (!Array.isArray(globalState.selectedCharacter) || isAllCharactersSelected()) {
            return [...characters];
        } else {
            return globalState.selectedCharacter.filter(character => MAIN_CHARACTERS.has(character));
        }
    }

    function syncLegendToGlobalState() {
        let activeKeys = legendState.filter(d => d.active).map(d => d.character);
        if (activeKeys.length === characters.length) {
            selectAllCharacters();
        } else {
            globalState.selectedCharacter = activeKeys;
        }
    }

    function setAllLegendCharacters(isActive) {
        legendState.forEach(d => {
            d.active = isActive;
        });
        syncLegendToGlobalState();
        syncLegendAndChart();
    }

    function toggleLegendCharacter(character) {
        let activeCount = legendState.filter(d => d.active).length;
        let current = legendState.find(d => d.character === character);
        if (!current) return;
        if (current.active && activeCount === 1) return;
        current.active = !current.active;
        syncLegendToGlobalState();
        syncLegendAndChart();
    }

    function syncLegendAndChart() {
        let selectedSet = new Set(getFilteredCharacters());
        legendState.forEach(d => {
            d.active = selectedSet.has(d.character);
        });
        renderStackedAreas();
        updateLegendStyles();
    }

    function renderStackedAreas() {
        let activeKeys = getFilteredCharacters();
        let filteredSeries = d3.stack().keys(activeKeys)(stackedRows);
        // Keep Y-axis fixed to the full chart range, even when legends are filtered.
        y.domain([0, maxY]).nice();

        gridLayer
            .data(y.ticks(6))
            .join("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", d => y(d))
            .attr("y2", d => y(d))
            .attr("stroke", "rgba(255,255,255,0.1)")
            .attr("stroke-dasharray", "4,3");

        yAxisLayer
            .call(d3.axisLeft(y).ticks(6))
            .call(ax => {
                ax.select(".domain").attr("stroke", "rgba(255,255,255,0.25)");
                ax.selectAll("text")
                    .style("fill", "rgba(255,255,255,0.88)")
                    .style("font-size", "11px")
                    .style("font-weight", "600");
            });

        let paths = areaLayer.selectAll("path")
            .data(filteredSeries, d => d.key)
            .join("path")
            .attr("fill", d => color(d.key))
            .attr("fill-opacity", 0.82)
            .attr("stroke", "rgba(255,255,255,0.55)")
            .attr("stroke-width", 0.9)
            .attr("d", area);

        paths
            .on("mouseenter", function (_, d) {
                d3.select(this).attr("stroke-width", 1.8).attr("fill-opacity", 0.95);
                tooltip.style("opacity", 1);
            })
            .on("mousemove", function (event, d) {
                let [gx] = d3.pointer(event, g.node());
                let idx = Math.max(0, Math.min(stackedRows.length - 1, Math.round(x.invert(gx))));
                let episode = episodes[idx];
                let value = stackedRows[idx][d.key] || 0;
                tooltip.html(
                    `<strong>${d.key}</strong><br>` +
                    `Episode: ${episode ? episode.label : "N/A"}<br>` +
                    `No. of dialogues: ${value.toLocaleString()}`
                );
                let [mx, my] = d3.pointer(event, panel);
                tooltip.style("left", `${mx + 12}px`).style("top", `${my + 10}px`);
            })
            .on("mouseleave", function () {
                d3.select(this).attr("stroke-width", 0.9).attr("fill-opacity", 0.82);
                tooltip.style("opacity", 0);
            });
    }

    function updateLegendStyles() {
        legendItems.each(function (d) {
            let isActive = d.active;
            let item = d3.select(this);
            item.select(".legend-bg")
                .attr("fill", isActive ? "rgba(7, 18, 29, 0.74)" : "rgba(7, 18, 29, 0.28)")
                .attr("stroke", isActive ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.1)");
            item.select(".legend-swatch")
                .attr("opacity", isActive ? 1 : 0.35);
            item.select(".legend-text")
                .style("opacity", isActive ? 1 : 0.45);
        });
    }

    renderStackedAreas();
    updateLegendStyles();

    panel.appendChild(svg.node());
}

function stopTimelineAnimation() {
    // No-op: timeline now renders as a static stacked area chart.
}
