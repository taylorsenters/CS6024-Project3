function renderCharacterNetworkSection() {

    let div = document.getElementById("networkSection");
    if (!div) return;

    let isOverall = globalState.selectedSeason === "overall";
    let viewLabel = isOverall ? "All seasons" : `Season ${globalState.selectedSeason}`;

    let hasSelectedCharacter = typeof globalState.selectedCharacter === "string" && globalState.selectedCharacter;
    let clearBtn = hasSelectedCharacter
        ? `<button class="clear-btn" id="networkClearBtn">✕ Clear character</button>`
        : "";

    div.innerHTML = `
        <div class="section-header-row">
            <h2 style="margin:0">Character Network</h2>
            ${clearBtn}
        </div>
        <p class="panel-subtitle">${viewLabel} — click a node to filter the page</p>
        <div class="network-inner-row">
            <div class="network-panel">
                <p class="chart-note" style="margin:0 0 6px;font-size:0.82rem">Force graph — drag nodes, click to filter</p>
                <div id="characterNetworkChart" class="network-chart-wrap"></div>
            </div>
            <div class="network-panel">
                <p class="chart-note" style="margin:0 0 6px;font-size:0.82rem">Chord diagram — hover arcs &amp; ribbons to explore connections</p>
                <div id="chordDiagramChart" class="chord-chart-wrap"></div>
            </div>
        </div>
    `;

    if (hasSelectedCharacter) {
        document.getElementById("networkClearBtn").onclick = () => {
            selectAllCharacters();
            globalState.selectedEpisodeKeys = new Set();
            document.querySelectorAll(".character-card").forEach(c => c.classList.remove("selected"));
            renderCharacterCharts();
            renderEpisodeCharts();
        };
    }

    let networkData = buildCharacterAdjacencyNetwork(globalState.data, globalState.selectedSeason);
    renderCharacterNetworkGraph(document.getElementById("characterNetworkChart"), networkData);
    renderChordDiagram(document.getElementById("chordDiagramChart"), networkData);
}


function buildCharacterAdjacencyNetwork(rows, selectedSeason) {

    let filtered = cleanCharacterRows(rows);
    if (selectedSeason !== "overall") {
        filtered = filtered.filter(d => d.Season === +selectedSeason);
    }

    let nodeNames = Array.from(MAIN_CHARACTERS);
    let adjacency = new Map();
    let sceneKeyToCharacters = new Map();

    filtered.forEach(row => {
        let sceneKey = getInteractionSceneKey(row);
        if (!sceneKeyToCharacters.has(sceneKey)) {
            sceneKeyToCharacters.set(sceneKey, new Set());
        }
        sceneKeyToCharacters.get(sceneKey).add(row.Character);
    });

    sceneKeyToCharacters.forEach(charSet => {
        let characters = Array.from(charSet);
        for (let i = 0; i < characters.length; i += 1) {
            for (let j = i + 1; j < characters.length; j += 1) {
                let source = characters[i];
                let target = characters[j];
                let pairKey = source < target ? `${source}__${target}` : `${target}__${source}`;
                adjacency.set(pairKey, (adjacency.get(pairKey) || 0) + 1);
            }
        }
    });

    let links = Array.from(adjacency.entries()).map(([pairKey, weight]) => {
        let [source, target] = pairKey.split("__");
        return { source, target, weight };
    });

    let connected = new Set();
    links.forEach(link => {
        connected.add(link.source);
        connected.add(link.target);
    });

    let nodes = nodeNames
        .filter(name => connected.has(name))
        .map(name => ({ id: name }));

    return { nodes, links };
}


function getInteractionSceneKey(row) {
    let season = Number.isFinite(row.Season) ? row.Season : "NA";
    let episode = Number.isFinite(row.Episode) ? row.Episode : "NA";
    let descriptor = (row.Full_Location_Descriptor || row.Location || "unknown-location")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    return `${season}|${episode}|${descriptor}`;
}


function renderCharacterNetworkGraph(container, networkData) {

    if (!container) return;
    container.innerHTML = "";

    if (!networkData.nodes.length || !networkData.links.length) {
        container.innerHTML = "<p class='word-cloud-placeholder' style='padding:10px'>No interaction data available for this filter.</p>";
        return;
    }

    let width = Math.max(container.getBoundingClientRect().width || 360, 360);
    let height = Math.max(container.getBoundingClientRect().height || 500, 500);
    let maxWeight = d3.max(networkData.links, d => d.weight) || 1;
    let minWeight = d3.min(networkData.links, d => d.weight) || 1;

    let linkWidth = d3.scaleLinear()
        .domain([minWeight, maxWeight])
        .range([1.5, 10]);

    let nodeRadius = d3.scaleSqrt()
        .domain([0, maxWeight])
        .range([15, 30]);

    let degreeCount = new Map(networkData.nodes.map(n => [n.id, 0]));
    networkData.links.forEach(link => {
        degreeCount.set(link.source, (degreeCount.get(link.source) || 0) + link.weight);
        degreeCount.set(link.target, (degreeCount.get(link.target) || 0) + link.weight);
    });

    let svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height);
    let defs = svg.append("defs");

    let gLinks = svg.append("g");
    let gEdgeLabels = svg.append("g");
    let gNodes = svg.append("g");
    let gLabels = svg.append("g");

    let linkDistance = Math.min(width, height) * 0.38;

    let simulation = d3.forceSimulation(networkData.nodes)
        .force("link", d3.forceLink(networkData.links).id(d => d.id).distance(linkDistance).strength(0.18))
        .force("charge", d3.forceManyBody().strength(-1000))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(width / 2).strength(0.06))
        .force("y", d3.forceY(height / 2).strength(0.06))
        .force("collide", d3.forceCollide().radius(d => nodeRadius(degreeCount.get(d.id) || 1) + 14));

    let selected = typeof globalState.selectedCharacter === "string" ? globalState.selectedCharacter : "";

    let links = gLinks.selectAll("line")
        .data(networkData.links)
        .join("line")
        .attr("stroke", "rgba(255, 214, 102, 0.55)")
        .attr("stroke-width", d => linkWidth(d.weight))
        .attr("opacity", d => {
            if (!selected) return 1;
            return getNodeId(d.source) === selected || getNodeId(d.target) === selected ? 1 : 0.1;
        });

    links.append("title")
        .text(d => `${getNodeId(d.source)} ↔ ${getNodeId(d.target)}: ${d.weight} shared scenes`);

    let edgeLabels = gEdgeLabels.selectAll("text")
        .data(networkData.links)
        .join("text")
        .text(d => d.weight)
        .attr("fill", "rgba(255,255,255,0.9)")
        .attr("font-size", "10px")
        .attr("font-weight", "700")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.45em")
        .attr("opacity", d => {
            if (!selected) return 1;
            return getNodeId(d.source) === selected || getNodeId(d.target) === selected ? 1 : 0.1;
        })
        .style("pointer-events", "none");

    let nodeGroups = gNodes.selectAll("g")
        .data(networkData.nodes)
        .join("g")
        .style("cursor", "pointer")
        .call(
            d3.drag()
                .on("start", dragStarted)
                .on("drag", dragged)
                .on("end", dragEnded)
        )
        .on("click", (_, d) => {
            globalState.selectedCharacter = d.id;
            globalState.selectedEpisodeKeys = new Set();
            document.querySelectorAll(".character-card").forEach(c => {
                c.classList.toggle("selected", c.dataset.character === d.id);
            });
            renderCharacterCharts();
            renderEpisodeCharts();
        })
        .on("mouseenter", function (_, d) {
            // Brighten the ring on hover (unless already selected — keep gold)
            d3.select(this).select("circle.node-ring")
                .attr("stroke", "#ffd766")
                .attr("stroke-width", d.id === globalState.selectedCharacter ? 3 : 2.5)
                .attr("stroke-opacity", d.id === globalState.selectedCharacter ? 1 : 0.65);
        })
        .on("mouseleave", function (_, d) {
            d3.select(this).select("circle.node-ring")
                .attr("stroke", d.id === globalState.selectedCharacter ? "#ffd766" : "rgba(8, 19, 31, 0.92)")
                .attr("stroke-width", d.id === globalState.selectedCharacter ? 3 : 2)
                .attr("stroke-opacity", 1);
        });

    nodeGroups.each(function (d) {
        let radius = nodeRadius(degreeCount.get(d.id) || 1);
        let clipId = getNodeClipId(d.id);
        let group = d3.select(this);

        defs.append("clipPath")
            .attr("id", clipId)
            .append("circle")
            .attr("r", radius)
            .attr("cx", 0)
            .attr("cy", 0);

        group.append("image")
            .attr("href", getCharacterImagePath(d.id))
            .attr("x", -radius)
            .attr("y", -radius)
            .attr("width", radius * 2)
            .attr("height", radius * 2)
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("clip-path", `url(#${clipId})`);

        // Named class so mouseenter/mouseleave can select it
        group.append("circle")
            .attr("class", "node-ring")
            .attr("r", radius)
            .attr("fill", "none")
            .attr("stroke", d.id === globalState.selectedCharacter ? "#ffd766" : "rgba(8, 19, 31, 0.92)")
            .attr("stroke-width", d.id === globalState.selectedCharacter ? 3 : 2);

        group.attr("opacity", 1);
    });

    nodeGroups.append("title")
        .text(d => `${d.id} — click to filter\n${(degreeCount.get(d.id) || 0)} shared scenes total`);

    let labels = gLabels.selectAll("text")
        .data(networkData.nodes)
        .join("text")
        .text(d => d.id)
        .attr("fill", "#ffffff")
        .attr("font-size", "12px")
        .attr("font-weight", "700")
        .attr("text-anchor", "middle")
        .attr("dy", d => `${nodeRadius(degreeCount.get(d.id) || 1) + 14}px`)
        .attr("stroke", "rgba(7, 18, 29, 0.96)")
        .attr("stroke-width", 3.5)
        .attr("paint-order", "stroke")
        .attr("opacity", 1)
        .style("letter-spacing", "0.02em")
        .style("pointer-events", "none");

    simulation.on("tick", () => {
        links
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        edgeLabels
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);

        nodeGroups
            .attr("transform", d => `translate(${d.x},${d.y})`);

        labels
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });

    container.appendChild(svg.node());

    function dragStarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragEnded(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    function getNodeId(nodeRef) {
        return typeof nodeRef === "string" ? nodeRef : nodeRef.id;
    }

    function getNodeClipId(characterName) {
        return `node-clip-${characterName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    }

    function getCharacterImagePath(characterName) {
        let card = characterCards.find(item => item.name === characterName);
        return card ? card.image : "images/default.png";
    }
}


function renderChordDiagram(container, networkData) {

    if (!container) return;
    container.innerHTML = "";
    container.style.position = "relative";

    const names = Array.from(MAIN_CHARACTERS).filter(n =>
        networkData.nodes.some(nd => nd.id === n)
    );
    const n = names.length;

    if (n < 2) {
        container.innerHTML = "<p style='padding:16px;color:rgba(255,255,255,0.55);font-size:0.9rem'>Not enough data for chord diagram.</p>";
        return;
    }

    // Build symmetric n×n matrix 
    const indexByName = new Map(names.map((name, i) => [name, i]));
    const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
    networkData.links.forEach(({ source, target, weight }) => {
        const srcName = typeof source === "string" ? source : source.id;
        const tgtName = typeof target === "string" ? target : target.id;
        const si = indexByName.get(srcName);
        const ti = indexByName.get(tgtName);
        if (si !== undefined && ti !== undefined) {
            matrix[si][ti] += weight;
            matrix[ti][si] += weight;
        }
    });

    const CHAR_COLORS = ["#ffd766", "#89c7ff", "#ff9f40", "#7ef0c3", "#c58cff", "#ff7fa1", "#f97aff"];
    const color = d3.scaleOrdinal().domain(names).range(CHAR_COLORS);

    const rect = container.getBoundingClientRect();
    const w = rect.width || 360;
    const h = rect.height || 520;
    const size = Math.max(Math.min(w, h), 260);
    const labelPad = Math.max(44, size * 0.13);
    const outerRadius = size / 2 - labelPad;
    const innerRadius = outerRadius - Math.max(14, size * 0.04);

    // d3 chord layout
    const chordLayout = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);
    const chords = chordLayout(matrix);

    const arcGen  = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    const ribbonGen = d3.ribbon().radius(innerRadius - 1);

    // SVG
    const svg = d3.create("svg")
        .attr("width", size)
        .attr("height", size);

    const defs = svg.append("defs");

    // Per-chord gradient: color flows from source arc color → target arc color
    chords.forEach(d => {
        const gradId = `cg-${d.source.index}-${d.target.index}`;
        const midSrc = (d.source.startAngle + d.source.endAngle) / 2 - Math.PI / 2;
        const midTgt = (d.target.startAngle + d.target.endAngle) / 2 - Math.PI / 2;

        const grad = defs.append("linearGradient")
            .attr("id", gradId)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", Math.cos(midSrc) * innerRadius)
            .attr("y1", Math.sin(midSrc) * innerRadius)
            .attr("x2", Math.cos(midTgt) * innerRadius)
            .attr("y2", Math.sin(midTgt) * innerRadius);

        grad.append("stop").attr("offset", "0%")
            .attr("stop-color", color(names[d.source.index]));
        grad.append("stop").attr("offset", "100%")
            .attr("stop-color", color(names[d.target.index]));
    });

    const g = svg.append("g").attr("transform", `translate(${size / 2},${size / 2})`);

    // Tooltip
    const tooltip = d3.select(container)
        .append("div")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("padding", "8px 10px")
        .style("font-size", "13px")
        .style("line-height", "1.45")
        .style("color", "#fff")
        .style("background", "rgba(8, 19, 31, 0.96)")
        .style("border", "1px solid rgba(255,255,255,0.22)")
        .style("border-radius", "10px")
        .style("box-shadow", "0 8px 22px rgba(0,0,0,0.32)")
        .style("max-width", "220px")
        .style("opacity", 0)
        .style("transition", "opacity 0.1s");

    // Ribbons (drawn before arcs so arcs sit on top) 
    const selectedIdx = typeof globalState.selectedCharacter === "string"
        ? indexByName.get(globalState.selectedCharacter)
        : undefined;

    const baseOpacity = d => {
        if (selectedIdx === undefined) return 0.72;
        return d.source.index === selectedIdx || d.target.index === selectedIdx ? 0.72 : 0.07;
    };

    const ribbonLayer = g.append("g");
    const ribbonPaths = ribbonLayer.selectAll("path")
        .data(chords)
        .join("path")
        .attr("d", ribbonGen)
        .attr("fill", d => `url(#cg-${d.source.index}-${d.target.index})`)
        .attr("stroke", "rgba(8,19,31,0.35)")
        .attr("stroke-width", 0.6)
        .attr("opacity", baseOpacity)
        .style("cursor", "pointer")
        .on("mouseenter", function (event, d) {
            d3.select(this)
                .attr("opacity", 1)
                .attr("stroke", "rgba(255,255,255,0.35)")
                .attr("stroke-width", 1.2);
            const wt = matrix[d.source.index][d.target.index];
            tooltip.style("opacity", 1).html(
                `<strong style="color:${color(names[d.source.index])}">${names[d.source.index]}</strong>` +
                ` ↔ <strong style="color:${color(names[d.target.index])}">${names[d.target.index]}</strong><br>` +
                `${wt.toLocaleString()} shared scenes`
            );
        })
        .on("mousemove", (event) => {
            const [mx, my] = d3.pointer(event, container);
            tooltip.style("left", `${mx + 14}px`).style("top", `${my - 10}px`);
        })
        .on("mouseleave", function (_, d) {
            d3.select(this)
                .attr("opacity", baseOpacity(d))
                .attr("stroke", "rgba(8,19,31,0.35)")
                .attr("stroke-width", 0.6);
            tooltip.style("opacity", 0);
        });

    // Outer arcs
    const groupGs = g.append("g")
        .selectAll("g")
        .data(chords.groups)
        .join("g");

    groupGs.append("path")
        .attr("d", arcGen)
        .attr("fill", d => color(names[d.index]))
        .attr("stroke", "rgba(8,19,31,0.6)")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("click", (_, d) => {
            const name = names[d.index];
            const alreadySelected = globalState.selectedCharacter === name;
            if (alreadySelected) {
                selectAllCharacters();
            } else {
                globalState.selectedCharacter = name;
            }
            globalState.selectedEpisodeKeys = new Set();
            document.querySelectorAll(".character-card").forEach(c => {
                c.classList.toggle("selected", c.dataset.character === globalState.selectedCharacter);
            });
            renderCharacterCharts();
            renderEpisodeCharts();
        })
        .on("mouseenter", function (event, d) {
            ribbonPaths.attr("opacity", r =>
                r.source.index === d.index || r.target.index === d.index ? 0.9 : 0.07
            );
            const total = matrix[d.index].reduce((s, v) => s + v, 0) / 2;
            const isSelected = globalState.selectedCharacter === names[d.index];
            tooltip.style("opacity", 1).html(
                `<strong style="color:${color(names[d.index])}">${names[d.index]}</strong><br>` +
                `${Math.round(total).toLocaleString()} total shared scenes<br>` +
                `<span style="opacity:0.6;font-size:11px">${isSelected ? "Click to deselect" : "Click to filter"}</span>`
            );
        })
        .on("mousemove", (event) => {
            const [mx, my] = d3.pointer(event, container);
            tooltip.style("left", `${mx + 14}px`).style("top", `${my - 10}px`);
        })
        .on("mouseleave", function () {
            ribbonPaths.attr("opacity", baseOpacity);
            tooltip.style("opacity", 0);
        });

    // Character name labels
    groupGs.append("text")
        .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", "0.35em")
        .attr("transform", d =>
            `rotate(${d.angle * 180 / Math.PI - 90}) translate(${outerRadius + 10}) ${d.angle > Math.PI ? "rotate(180)" : ""}`
        )
        .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
        .style("fill", d => color(names[d.index]))
        .style("font-size", `${Math.max(10, Math.min(13, size / 34))}px`)
        .style("font-weight", "700")
        .style("letter-spacing", "0.02em")
        .style("pointer-events", "none")
        .text(d => names[d.index]);

    container.appendChild(svg.node());
}