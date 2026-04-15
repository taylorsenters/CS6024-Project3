function renderCharacterNetworkSection() {

    let div = document.getElementById("networkSection");
    if (!div) return;

    let isOverall = globalState.selectedSeason === "overall";
    let viewLabel = isOverall ? "All seasons" : `Season ${globalState.selectedSeason}`;

    div.innerHTML = `
        <h2>Character Network</h2>
        <p class="panel-subtitle">Adjacency matrix view: ${viewLabel}</p>
        <div id="characterNetworkChart" class="network-chart-wrap"></div>
    `;

    let networkData = buildCharacterAdjacencyNetwork(globalState.data, globalState.selectedSeason);
    renderCharacterNetworkGraph(document.getElementById("characterNetworkChart"), networkData);
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
    let height = 340;
    let maxWeight = d3.max(networkData.links, d => d.weight) || 1;
    let minWeight = d3.min(networkData.links, d => d.weight) || 1;

    let linkWidth = d3.scaleLinear()
        .domain([minWeight, maxWeight])
        .range([1.2, 8]);

    let nodeRadius = d3.scaleSqrt()
        .domain([0, maxWeight])
        .range([11, 24]);

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

    let simulation = d3.forceSimulation(networkData.nodes)
        .force("link", d3.forceLink(networkData.links).id(d => d.id).distance(120).strength(0.24))
        .force("charge", d3.forceManyBody().strength(-350))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(d => nodeRadius(degreeCount.get(d.id) || 1) + 4));

    let links = gLinks.selectAll("line")
        .data(networkData.links)
        .join("line")
        .attr("stroke", "rgba(255, 214, 102, 0.55)")
        .attr("stroke-width", d => linkWidth(d.weight));

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
        .style("pointer-events", "none");

    let nodeGroups = gNodes.selectAll("g")
        .data(networkData.nodes)
        .join("g")
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

        group.append("circle")
            .attr("r", radius)
            .attr("fill", "none")
            .attr("stroke", d.id === globalState.selectedCharacter ? "#ffd766" : "rgba(8, 19, 31, 0.92)")
            .attr("stroke-width", d.id === globalState.selectedCharacter ? 3 : 2);
    });

    nodeGroups.append("title")
        .text(d => `${d.id}: ${(degreeCount.get(d.id) || 0)} interaction weight`);

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
