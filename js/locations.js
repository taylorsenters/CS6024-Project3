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

    const hasSelectedCharacter = typeof globalState.selectedCharacter === "string" && globalState.selectedCharacter;
    const clearBtn = hasSelectedCharacter
        ? `<button class="clear-btn" id="locationsClearBtn">✕ Clear character</button>`
        : "";

    div.innerHTML = `
        <div class="section-header-row">
            <h2 style="margin:0">Where Characters Speak</h2>
            ${clearBtn}
        </div>
        <p class="chart-note">
            Top ${TOP_LOCATIONS} locations by dialogue lines — ${scopeLabel}.
            ${hasSelectedCharacter
                ? `Highlighting <strong>${globalState.selectedCharacter}</strong>.`
                : "Select a character above to highlight their column."}
        </p>
        <div class="season-filter">
            <label for="locationsSeasonSelect">Season:</label>
            <select id="locationsSeasonSelect"></select>
        </div>
        <div id="locationsChart"></div>
        <div id="dialogueTimelinePanel"></div>
    `;

    // Season dropdown — shares globalState.selectedSeason with other sections
    const seasonSelect = document.getElementById("locationsSeasonSelect");
    seasonSelect.innerHTML = [`<option value="overall">All Seasons</option>`]
        .concat(seasons.map(s => `<option value="${s}">Season ${s}</option>`))
        .join("");
    seasonSelect.value = String(globalState.selectedSeason);
    seasonSelect.onchange = (e) => {
        globalState.selectedSeason = e.target.value;
        selectAllCharacters();
        globalState.selectedEpisodeKeys = new Set();
        renderCharacterCharts();
        renderEpisodeCharts();
    };

    // Clear character button
    const clearBtnEl = document.getElementById("locationsClearBtn");
    if (clearBtnEl) {
        clearBtnEl.onclick = () => {
            selectAllCharacters();
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
    renderDialogueTimeline(document.getElementById("dialogueTimelinePanel"));
}


function renderHeatmap(container, matrix, locations, characters, globalMax) {

    container.innerHTML = "";
    container.style.position = "relative";

    // Fill available container width
    const containerW = (container.getBoundingClientRect().width || 860);
    const margin  = { top: 62, right: 16, bottom: 16, left: Math.min(240, Math.max(170, containerW * 0.34)) };
    const rowH    = containerW < 500 ? 44 : 56;
    const innerH  = locations.length * rowH;
    const innerW  = containerW - margin.left - margin.right;
    const colW    = innerW / characters.length;
    const totalH  = innerH + margin.top + margin.bottom;

    const tooltip = d3.select(container)
        .append("div")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("padding", "8px 10px")
        .style("font-size", "11px")
        .style("line-height", "1.35")
        .style("color", "#fff")
        .style("background", "rgba(8, 19, 31, 0.96)")
        .style("border", "1px solid rgba(255,255,255,0.24)")
        .style("border-radius", "10px")
        .style("box-shadow", "0 8px 22px rgba(0,0,0,0.3)")
        .style("max-width", "250px")
        .style("opacity", 0);

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
        .attr("y", -12)
        .attr("text-anchor", "middle")
        .style("fill", d => d === globalState.selectedCharacter
            ? "#ffd766"
            : "rgba(255,255,255,0.72)")
        .style("font-size", containerW < 500 ? "10px" : "14px")
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
        .attr("y", d => y(d) + 14)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "hanging")
        .style("fill", "rgba(255,255,255,0.86)")
        .style("font-size", containerW < 500 ? "10px" : "12px")
        .style("font-weight", "600")
        .text(d => formatLocation(d));

    // Location images below labels (if available)
    g.selectAll(".loc-thumb")
        .data(locations)
        .join("image")
        .attr("class", "loc-thumb")
        .attr("href", d => getLocationImagePath(d) || "")
        .attr("x", -48)
        .attr("y", d => y(d) + 28)
        .attr("width", 36)
        .attr("height", 22)
        .attr("rx", 4)
        .attr("opacity", d => getLocationImagePath(d) ? 0.96 : 0)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .style("cursor", d => getLocationImagePath(d) ? "pointer" : "default")
        .on("click", (_, d) => {
            let locationImagePath = getLocationImagePath(d);
            if (!locationImagePath) return;
            showLocationImagePopup(locationImagePath, formatLocation(d));
        });

    // ── Cells ──────────────────────────────────────────────────────────────
    const selected = typeof globalState.selectedCharacter === "string" ? globalState.selectedCharacter : "";

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
        .style("cursor", d => d.count > 0 ? "pointer" : "default")
        .on("mouseenter", function (event, d) {
            if (d.count <= 0) return;
            d3.select(this).attr("stroke", "rgba(255,255,255,0.72)").attr("stroke-width", 1.2);
            let characterImg = getCharacterImagePath(d.chr);
            let locationImg = getLocationImagePath(d.loc);
            tooltip.style("opacity", 1).html(`
                <div style="display:flex; gap:8px; align-items:flex-start;">
                    ${characterImg ? `<img src="${characterImg}" alt="${d.chr}" style="width:34px;height:34px;border-radius:6px;object-fit:cover;border:1px solid rgba(255,255,255,0.25)">` : ""}
                    <div>
                        <div style="font-weight:700">${d.chr}</div>
                        <div style="opacity:0.88">${formatLocation(d.loc)}</div>
                        <div style="margin-top:2px">Dialogues: <strong>${d.count.toLocaleString()}</strong></div>
                    </div>
                </div>
                ${locationImg ? `<div style="margin-top:8px"><img src="${locationImg}" alt="${formatLocation(d.loc)}" style="width:100%;max-width:220px;height:74px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,0.2)"></div>` : ""}
            `);
        })
        .on("mousemove", function (event) {
            let [mx, my] = d3.pointer(event, container);
            tooltip
                .style("left", `${mx + 12}px`)
                .style("top", `${my + 12}px`);
        })
        .on("mouseleave", function () {
            d3.select(this).attr("stroke", "none");
            tooltip.style("opacity", 0);
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
            .style("font-size", containerW < 500 ? "11px" : "13px")
            .style("font-weight", "700")
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
    if (alreadySelected) {
        selectAllCharacters();
    } else {
        globalState.selectedCharacter = character;
    }
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

function getCharacterImagePath(characterName) {
    let card = characterCards.find(item => item.name === characterName);
    return card ? card.image : null;
}

function getLocationImagePath(locationName) {
    const IMAGE_BY_LOCATION = {
        "sheldon & leonard's apartment": "images/Sheldon & Leonard's Apartment.webp",
        "penny's apartment": "images/Penny's Apartment.webp",
        "caltech cafeteria": "images/Caltech Cafeteria.webp",
        "cheesecake factory": "images/Cheesecake Factory.jpeg",
        "stairwell": "images/Stairwell.webp",
        "howard's house": "images/Howard's House.webp",
        "comic book store": "images/Comic Book Store.jpg",
        "university office": "images/University Office.jpg"
    };

    let key = String(locationName || "")
        .toLowerCase()
        .replace(/[\u2018\u2019\u02BC]/g, "'")
        .replace(/\s+/g, " ")
        .trim();

    if (IMAGE_BY_LOCATION[key]) return IMAGE_BY_LOCATION[key];

    // Loose match for variant forms like "the caltech cafeteria", "penny apartment"
    if (key.includes("caltech") && key.includes("cafeteria")) return IMAGE_BY_LOCATION["caltech cafeteria"];
    if (key.includes("cheesecake")) return IMAGE_BY_LOCATION["cheesecake factory"];
    if (key.includes("stairwell")) return IMAGE_BY_LOCATION["stairwell"];
    if (key.includes("comic") && key.includes("store")) return IMAGE_BY_LOCATION["comic book store"];
    if (key.includes("university") && key.includes("office")) return IMAGE_BY_LOCATION["university office"];
    if (key.includes("howard") && key.includes("house")) return IMAGE_BY_LOCATION["howard's house"];
    if (key.includes("penny") && key.includes("apartment")) return IMAGE_BY_LOCATION["penny's apartment"];
    if (key.includes("sheldon") && key.includes("leonard") && key.includes("apartment")) return IMAGE_BY_LOCATION["sheldon & leonard's apartment"];

    return null;
}

function showLocationImagePopup(imagePath, locationTitle) {
    const existing = document.getElementById("locationImagePopupOverlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "locationImagePopupOverlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.72)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "20px";

    const popup = document.createElement("div");
    popup.style.position = "relative";
    popup.style.maxWidth = "760px";
    popup.style.width = "100%";
    popup.style.background = "rgba(8, 19, 31, 0.98)";
    popup.style.border = "1px solid rgba(255,255,255,0.2)";
    popup.style.borderRadius = "12px";
    popup.style.padding = "14px 14px 12px";
    popup.style.boxShadow = "0 18px 42px rgba(0,0,0,0.42)";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "✕ Close";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "10px";
    closeBtn.style.right = "10px";
    closeBtn.style.border = "1px solid rgba(255,255,255,0.28)";
    closeBtn.style.background = "rgba(7,18,29,0.8)";
    closeBtn.style.color = "#fff";
    closeBtn.style.padding = "4px 10px";
    closeBtn.style.borderRadius = "8px";
    closeBtn.style.cursor = "pointer";

    const title = document.createElement("h4");
    title.textContent = locationTitle;
    title.style.margin = "0 0 10px";
    title.style.color = "#ffd766";
    title.style.fontSize = "1rem";

    const image = document.createElement("img");
    image.src = imagePath;
    image.alt = locationTitle;
    image.style.width = "100%";
    image.style.maxHeight = "72vh";
    image.style.objectFit = "cover";
    image.style.borderRadius = "10px";
    image.style.border = "1px solid rgba(255,255,255,0.18)";

    closeBtn.onclick = () => overlay.remove();
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    popup.appendChild(closeBtn);
    popup.appendChild(title);
    popup.appendChild(image);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}
