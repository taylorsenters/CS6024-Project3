// global state
let globalState = {
    data: [],
    selectedCharacter: null
};

// load your cleaned dataset
d3.csv("data/tbbt_cleaned_data.csv").then(data => {

    data.forEach(d => {
        d.Season = +d.Season;
        d.Episode = +d.Episode;

        // count words
        d.wordCount = d.Dialogue ? d.Dialogue.split(" ").length : 0;
    });

    globalState.data = data;

    renderOverview();
    renderCharacterCharts();
});


// show overview
function renderOverview() {

    let div = document.getElementById("overview");

    div.innerHTML = `
        <h2>Overview</h2>
        <p>Series: The Big Bang Theory</p>
        <p>Run: September 24, 2007 – May 16, 2019</p>
        <p>Total Episodes: 279</p>
        <p>Genre: Sitcom</p>
    `;
}


// character charts
function renderCharacterCharts() {

    let div = document.getElementById("characterCharts");
    div.innerHTML = "<h2>Character Importance</h2>";

    let data = globalState.data;

    // clean bad names
    let filtered = data.filter(d =>
        d.Character &&
        !d.Character.includes("(") &&
        !d.Character.includes(")") &&
        d.Character.length < 20
    );

    let grouped = d3.group(filtered, d => d.Character);

    let characterStats = [];

    grouped.forEach((values, character) => {

        let totalWords = d3.sum(values, d => d.wordCount);

        let episodesSet = new Set(
            values.map(d => d.Season + "-" + d.Episode)
        );

        let totalEpisodes = episodesSet.size;

        characterStats.push({
            character: character,
            words: totalWords,
            episodes: totalEpisodes
        });
    });

    // sort by importance
    characterStats.sort((a, b) => b.words - a.words);

    // show top 8
    characterStats = characterStats.slice(0, 8);

    characterStats.forEach(c => {

        let bar1 = document.createElement("div");
        bar1.className = "bar";
        bar1.style.width = c.episodes * 4 + "px";
        bar1.innerText = c.character + " (" + c.episodes + " episodes)";

        bar1.title = "click to see episodes";

        bar1.onclick = () => {
            globalState.selectedCharacter = c.character;
            renderEpisodeCharts();
            renderCharacterCharts();

            // scroll to episode section
            document.getElementById("episodeCharts").scrollIntoView({
                behavior: "smooth"
            });
        };

        if (globalState.selectedCharacter === c.character) {
            bar1.style.border = "2px solid yellow";
        }

        let bar2 = document.createElement("div");
        bar2.className = "bar";
        bar2.style.width = c.words / 40 + "px";
        bar2.innerText = c.character + " words: " + c.words;

        div.appendChild(bar1);
        div.appendChild(bar2);
    });
}


// episode charts
function renderEpisodeCharts() {

    let div = document.getElementById("episodeCharts");

    // clear and show header
    div.innerHTML = "<h2>Episode Details</h2>";

    if (!globalState.selectedCharacter) {
        div.innerHTML += "<p>click a character</p>";
        return;
    }

    // show selected character clearly
    div.innerHTML += "<h3>Selected: " + globalState.selectedCharacter + "</h3>";
    div.innerHTML += "<p>showing first 25 episodes</p>";

    let data = globalState.data.filter(d =>
        d.Character === globalState.selectedCharacter
    );

    let grouped = d3.group(data, d => d.Season + "-" + d.Episode);

    // convert to array
    let episodeArray = Array.from(grouped);

    // proper numeric sort
    episodeArray.sort((a, b) => {
        let [s1, e1] = a[0].split("-").map(Number);
        let [s2, e2] = b[0].split("-").map(Number);

        if (s1 !== s2) return s1 - s2;
        return e1 - e2;
    });

    // limit
    episodeArray = episodeArray.slice(0, 25);

    episodeArray.forEach(([ep, values]) => {

        let words = d3.sum(values, d => d.wordCount);

        let [season, episode] = ep.split("-");

        let bar = document.createElement("div");
        bar.className = "bar";
        bar.style.width = words / 8 + "px";
        bar.style.background = "lightgreen";

        bar.innerText =
            "Season " + season +
            " Episode " + episode +
            " — " + words + " words";

        div.appendChild(bar);
    });
}