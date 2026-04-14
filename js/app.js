document.addEventListener("DOMContentLoaded", async () => {

    await loadVisualizationMarkup();

    initializeThemeSongOnFirstLoad();

    await loadAndPrepareData();

    renderCharacterGallery();
    renderOverview();
    renderCharacterCharts();
    renderEpisodeCharts();   // also calls renderAnalysisSection + renderLocationsSection internally

    // Re-render D3 SVG charts when the window is resized so they fill their containers
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            renderEpisodeCharts();   // cascades to renderAnalysisSection + renderLocationsSection
        }, 250);
    });
});
