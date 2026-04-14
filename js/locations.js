// ─── Where Characters Speak (Location Heatmap) ──────────────────────────────

const TOP_LOCATIONS = 15;

function renderLocationsSection() {

    const div = document.getElementById("locationsSection");
    if (!div) return;

    // Build scope label for subtitle
    let scopeLabel = "all seasons";
    if (globalState.selectedSeason !== "overall") scopeLabel = `Season ${globalState.selectedSeason}`;
    if (globalState.selectedEpisodeKeys.size > 0) {
        let n = globalState.selectedEpisodeKeys.size;
        scopeLabel = `${n} selected episode${n > 1 ? "s" : ""}`;
    }

    const seasons = Array.from(new Set(
        cleanCharacterRows(globalState.data).map(d => d.Season)
    )).sort((a, b) => a - b);

    const clearBtn = globalState.selectedCharacter
        ? `<button class="clear-btn" id="locationsClearBtn">✕ Clear character</button>`
        : "";

    div.innerHTML = `
        <div class="section-header-row">
            <h2 style="margin:0">Where Characters Speak</h2>
            ${clearBtn}
        </div>
        <p class="chart-note">
            Top ${TOP_LOCATIONS} locations by dialogue lines — ${scopeLabel}.
            ${globalState.selectedCharacter
                ? `Highlighting <strong>${globalState.selectedCharacter}</strong>.`
                : "Select a character above to highlight their column."}
        </p>
        <div class="season-filter">
            <label for="locationsSeasonSelect">Season:</label>
            <select id="locationsSeasonSelect"></select>
        </div>
        <div id="locationsChart"></div>
    `;

    // Season dropdown — shares globalState.selectedSeason with other sections
    const seasonSelect = document.getElementById("locationsSeasonSelect");
    seasonSelect.innerHTML = [`<option value="overall">All Seasons</option>`]
        .concat(seasons.map(s => `<option value="${s}">Season ${s}</option>`))
        .join("");
    seasonSelect.value = String(globalState.selectedSeason);
    seasonSelect.onchange = (e) => {
        globalState.selectedSeason = e.target.value;
        globalState.selectedEpisodeKeys = new Set();
        renderCharacterCharts();
        renderEpisodeCharts();
    };

    // Clear character button
    const clearBtnEl = document.getElementById("locationsClearBtn");
    if (clearBtnEl) {
        clearBtnEl.onclick = () => {
            globalState.selectedCharacter = null;
            globalState.selectedEpisodeKeys = new Set();
            document.querySelectorAll(".character-card").forEach(c => c.classList.remove("selected"));
            renderCharacterCharts();
            renderEpisodeCharts();
        };
    }

    // ── Filter data ────────────────────────────────────────────────────────

    let data = cleanCharacterRows(globalState.data)
        .filter(d => d.Location && d.Location.trim());

    if (globalState.selectedSeason !== "overall") {
        data = data.filter(d => d.Season === +globalState.selectedSeason);
    }

    if (globalState.selectedEpisodeKeys.size > 0) {
        data = data.filter(d =>
            globalState.selectedEpisodeKeys.has(d.Season + "-" + d.Episode)
        );
    }

    const chartDiv = document.getElementById("locationsChart");

    if (!data.length) {
        chartDiv.innerHTML = "<p class='chart-note'>No location data for the current selection.</p>";
        return;
    }

    // ── Top locations (by total lines across all main characters) ──────────

    const locTotals = new Map();
    data.forEach(d => locTotals.set(d.Location, (locTotals.get(d.Location) || 0) + 1));

    const topLocs = Array.from(locTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_LOCATIONS)
        .map(([loc]) => loc);

    // ── Pre-group: location → character → line count ───────────────────────

    const grouped = new Map();
    data.forEach(row => {
        if (!topLocs.includes(row.Location)) return;
        if (!grouped.has(row.Location)) grouped.set(row.Location, new Map());
        const cm = grouped.get(row.Location);
        cm.set(row.Character, (cm.get(row.Character) || 0) + 1);
    });

    // ── Build matrix ───────────────────────────────────────────────────────

    const characters = [...MAIN_CHARACTERS];
    const matrix = [];
    let globalMax = 0;

    topLocs.forEach(loc => {
        const cm = grouped.get(loc) || new Map();
        characters.forEach(chr => {
            const count = cm.get(chr) || 0;
            if (count > globalMax) globalMax = count;
            matrix.push({ loc, chr, count });
        });
    });

    renderHeatmap(chartDiv, matrix, topLocs, characters, globalMax);
}


function renderHeatmap(container, matrix, locations, characters, globalMax) {

    container.innerHTML = "";

    // Fill available container width
    const containerW = (container.getBoundingClientRect().width || 860);
    const margin  = { top: 56, right: 16, bottom: 16, left: Math.min(196, Math.max(120, containerW * 0.28)) };
    const rowH    = containerW < 500 ? 26 : 34;
    const innerH  = locations.length * rowH;
    const innerW  = containerW - margin.left - margin.right;
    const colW    = innerW / characters.length;
    const totalH  = innerH + margin.top + margin.bottom;

    const svg = d3.create("svg")
        .attr("width", containerW)
        .attr("height", totalH);

    const defs = svg.append("defs");

    // Glow filter for selected column highlight
    const glow = defs.append("filter").attr("id", "colGlow");
    glow.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "3").attr("result", "blur");
    const feMerge = glow.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand().domain(characters).range([0, innerW]).padding(0.06);
    const y = d3.scaleBand().domain(locations).range([0, innerH]).padding(0.06);

    // Color scale: dark cell → theme yellow, zero cells get a near-invisible fill
    const colorScale = d3.scaleSequential()
        .domain([1, globalMax])
        .interpolator(d3.interpolateRgb("rgba(255,214,102,0.12)", "#ffd766"))
        .clamp(true);

    // ── Subtle column highlight behind selected character ──────────────────
    if (globalState.selectedCharacter && characters.includes(globalState.selectedCharacter)) {
        g.append("rect")
            .attr("x", x(globalState.selectedCharacter) - 2)
            .attr("y", -margin.top + 8)
            .attr("width", x.bandwidth() + 4)
            .attr("height", innerH + margin.top - 8)
            .attr("rx", 6)
            .attr("fill", "rgba(255,214,102,0.07)")
            .attr("stroke", "rgba(255,214,102,0.3)")
            .attr("stroke-width", 1);
    }

    // ── Character name headers ────────────────────────────────
    g.selectAll(".char-label")
        .data(characters)
        .join("text")
        .attr("class", "char-label")
        .attr("x", d => x(d) + x.bandwidth() / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("fill", d => d === globalState.selectedCharacter
            ? "#ffd766"
            : "rgba(255,255,255,0.72)")
        .style("font-size", containerW < 500 ? "9px" : "12px")
        .style("font-weight", d => d === globalState.selectedCharacter ? "700" : "400")
        .style("cursor", "pointer")
        .style("text-decoration", d => d === globalState.selectedCharacter ? "underline" : "none")
        .text(d => d)
        .on("click", (_, d) => selectCharacterFromChart(d))
        .on("mouseenter", function(_, d) {
            if (d !== globalState.selectedCharacter)
                d3.select(this).style("fill", "rgba(255,255,255,0.95)");
        })
        .on("mouseleave", function(_, d) {
            d3.select(this).style("fill", d === globalState.selectedCharacter
                ? "#ffd766"
                : "rgba(255,255,255,0.72)");
        });

    // ── Location row labels ────────────────────────────────────────────────
    g.selectAll(".loc-label")
        .data(locations)
        .join("text")
        .attr("class", "loc-label")
        .attr("x", -10)
        .attr("y", d => y(d) + y.bandwidth() / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .style("fill", "rgba(255,255,255,0.68)")
        .style("font-size", containerW < 500 ? "9px" : "11px")
        .text(d => formatLocation(d));

    // ── Cells ──────────────────────────────────────────────────────────────
    const selected = globalState.selectedCharacter;

    g.selectAll(".hm-cell")
        .data(matrix)
        .join("rect")
        .attr("class", "hm-cell")
        .attr("x", d => x(d.chr))
        .attr("y", d => y(d.loc))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("rx", 3)
        .attr("fill", d => d.count === 0
            ? "rgba(255,255,255,0.03)"
            : colorScale(d.count))
        .attr("opacity", d => {
            if (!selected) return 1;
            return d.chr === selected ? 1 : 0.28;
        })
        .style("cursor", "default")
        .each(function(d) {
            if (d.count > 0) {
                d3.select(this).append("title")
                    .text(`${d.chr} @ ${formatLocation(d.loc)}\n${d.count.toLocaleString()} lines`);
            }
        });

    // ── Line count labels inside cells ──────────────
    if (colW >= 52) {
        g.selectAll(".cell-label")
            .data(matrix.filter(d => d.count > 0))
            .join("text")
            .attr("class", "cell-label")
            .attr("x", d => x(d.chr) + x.bandwidth() / 2)
            .attr("y", d => y(d.loc) + y.bandwidth() / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "9px")
            .style("pointer-events", "none")
            .style("fill", d => d.count / globalMax > 0.55
                ? "rgba(10,20,34,0.9)"   // dark text on bright yellow cells
                : "rgba(255,255,255,0.75)")
            .style("opacity", d => !selected || d.chr === selected ? 1 : 0.28)
            .text(d => d.count >= 1000
                ? (d.count / 1000).toFixed(1) + "k"
                : d.count);
    }

    // ── Color legend ───────────────────────────────────────────────────────
    const legendW = Math.min(200, innerW * 0.3);
    const legendH = 8;
    const legendX = innerW - legendW;
    const legendY = innerH + 4;

    const legendGrad = defs.append("linearGradient").attr("id", "hmLegend");
    legendGrad.append("stop").attr("offset", "0%").attr("stop-color", "rgba(255,214,102,0.12)");
    legendGrad.append("stop").attr("offset", "100%").attr("stop-color", "#ffd766");

    const lg = g.append("g").attr("transform", `translate(${legendX},${legendY})`);
    lg.append("rect")
        .attr("width", legendW).attr("height", legendH).attr("rx", 3)
        .attr("fill", "url(#hmLegend)");
    lg.append("text")
        .attr("y", legendH + 12).attr("x", 0)
        .style("fill", "rgba(255,255,255,0.45)").style("font-size", "9px")
        .text("fewer lines");
    lg.append("text")
        .attr("y", legendH + 12).attr("x", legendW)
        .attr("text-anchor", "end")
        .style("fill", "rgba(255,255,255,0.45)").style("font-size", "9px")
        .text("more lines");

    container.appendChild(svg.node());
}


// Toggle character selection from the heatmap — syncs gallery, importance, and episode charts
function selectCharacterFromChart(character) {
    const alreadySelected = globalState.selectedCharacter === character;
    globalState.selectedCharacter = alreadySelected ? null : character;
    globalState.selectedEpisodeKeys = new Set();

    document.querySelectorAll(".character-card").forEach(c => {
        c.classList.toggle("selected", c.dataset.character === globalState.selectedCharacter);
    });

    renderCharacterCharts();
    renderEpisodeCharts();
}


// Normalise location name: replace curly apostrophes, title-case each word
function formatLocation(loc) {
    return loc
        .replace(/[\u2018\u2019\u02BC]/g, "'")
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}
