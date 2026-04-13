async function loadVisualizationMarkup() {

    let slots = Array.from(document.querySelectorAll("[data-include]"));

    let fallback = {
        "html/overview.html": "<div id=\"overview\"></div>",
        "html/character-gallery.html": "<section id=\"characterGallery\"></section>",
        "html/character-importance.html": "<div id=\"characterCharts\"></div>",
        "html/episode-details.html": "<div id=\"episodeCharts\"></div>"
    };

    for (let slot of slots) {
        let path = slot.getAttribute("data-include");
        try {
            let response = await fetch(path);
            if (!response.ok) {
                throw new Error("failed to load " + path);
            }
            slot.innerHTML = await response.text();
        } catch (error) {
            slot.innerHTML = fallback[path] || "";
        }
    }
}
