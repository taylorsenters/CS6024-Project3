function renderDialogueTimeline(container) {

    if (!container) return;

    let allCharacterRows = cleanCharacterRows(globalState.data);
    if (!allCharacterRows.length) {
        container.innerHTML = `
            <h3 style="margin:14px 0 6px">Character Dialogue Timeline</h3>
            <p class="chart-note">No dialogue timeline data available.</p>
        `;
        return;
    }

    let episodes = d3.rollups(
        allCharacterRows,
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

    allCharacterRows.forEach(row => {
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

    container.innerHTML = `
        <div class="section-header-row" style="margin-top:14px">
            <h3 style="margin:0">Character Dialogue Timeline</h3>
        </div>
        <p class="chart-note">Stacked area chart of dialogue counts across season/episode timeline for all main characters.</p>
        <div id="dialogueTimelineChart" class="episode-bars-panel"></div>
    `;

    const panel = document.getElementById("dialogueTimelineChart");
    const panelW = panel.getBoundingClientRect().width || 900;
    const margin = { top: 20, right: 18, bottom: 66, left: 78 };
    const width = panelW - margin.left - margin.right;
    const height = 420;
    const innerH = height - margin.top - margin.bottom;
    const xTickStep = Math.max(1, Math.ceil(stackedRows.length / Math.max(7, Math.floor(width / 90))));

    let x = d3.scaleLinear()
        .domain([0, stackedRows.length - 1])
        .range([0, width]);

    let stack = d3.stack().keys([...MAIN_CHARACTERS]);
    let series = stack(stackedRows);
    let maxY = d3.max(series, s => d3.max(s, d => d[1])) || 1;

    let y = d3.scaleLinear()
        .domain([0, maxY])
        .nice()
        .range([innerH, 0]);

    let color = d3.scaleOrdinal()
        .domain([...MAIN_CHARACTERS])
        .range(["#ffd766", "#89c7ff", "#ff9f40", "#7ef0c3", "#c58cff", "#ff7fa1", "#98d7ff"]);

    let svg = d3.create("svg")
        .attr("width", panelW)
        .attr("height", height);

    let g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
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

    g.append("g")
        .selectAll("path")
        .data(series)
        .join("path")
        .attr("fill", d => color(d.key))
        .attr("fill-opacity", 0.8)
        .attr("stroke", "rgba(255,255,255,0.55)")
        .attr("stroke-width", 0.9)
        .attr("d", area)
        .append("title")
        .text(d => d.key);

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

    g.append("g")
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

    let legend = g.append("g").attr("transform", "translate(0,-6)");
    [...MAIN_CHARACTERS].forEach((character, i) => {
        let item = legend.append("g").attr("transform", `translate(${i * 112},0)`);
        item.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("rx", 2)
            .attr("fill", color(character));
        item.append("text")
            .attr("x", 14)
            .attr("y", 9)
            .style("fill", "rgba(255,255,255,0.85)")
            .style("font-size", "10px")
            .style("font-weight", "600")
            .text(character);
    });

    panel.appendChild(svg.node());
}

function stopTimelineAnimation() {
    // No-op: timeline now renders as a static stacked area chart.
}
