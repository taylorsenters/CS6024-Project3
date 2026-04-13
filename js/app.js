document.addEventListener("DOMContentLoaded", async () => {

    await loadVisualizationMarkup();

    initializeThemeSongOnFirstLoad();

    await loadAndPrepareData();

    renderCharacterGallery();
    renderOverview();
    renderCharacterCharts();
    renderEpisodeCharts();
});
