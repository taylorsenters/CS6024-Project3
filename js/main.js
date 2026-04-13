// global state
let globalState = {
    data: [],
    selectedCharacter: null,
    selectedSeason: null
};

const THEME_SONG_FIRST_LOAD_KEY = "tbbtThemeSongFirstLoadDone";
const MAIN_CHARACTERS = new Set([
    "Sheldon",
    "Leonard",
    "Penny",
    "Howard",
    "Raj",
    "Bernadette",
    "Amy"
]);

let characterCards = [
    {
        name: "Sheldon",
        image: "images/Sheldon.png",
        title: "Theoretical physicist at Caltech",
        facts: [
            "Full name: Sheldon Lee Cooper",
            "Born in Galveston, Texas",
            "Education: multiple advanced degrees, including a Ph.D.",
            "Spouse: Amy Farrah Fowler"
        ]
    },
    {
        name: "Leonard",
        image: "images/Leonard.png",
        title: "Experimental physicist",
        facts: [
            "Full name: Leonard Leakey Hofstadter",
            "Originally from New Jersey",
            "Earned his Ph.D. at Princeton University",
            "Spouse: Penny Hofstadter"
        ]
    },
    {
        name: "Penny",
        image: "images/Penny.png",
        title: "Actress, waitress, and sales representative",
        facts: [
            "Full name: Penelope \"Penny\" Hofstadter",
            "Originally from outside Omaha, Nebraska",
            "Worked at the Cheesecake Factory before moving into sales",
            "Spouse: Leonard Hofstadter"
        ]
    },
    {
        name: "Howard",
        image: "images/Howard.png",
        title: "Aerospace engineer and astronaut",
        facts: [
            "Full name: Howard Joel Wolowitz",
            "Education: M.Eng. from MIT",
            "Worked as an aerospace engineer at Caltech",
            "Spouse: Bernadette Rostenkowski-Wolowitz"
        ]
    },
    {
        name: "Raj",
        image: "images/Raj.png",
        title: "Astrophysicist",
        facts: [
            "Full name: Rajesh Ramayan Koothrappali",
            "Originally from New Delhi, India",
            "Studied at the University of Cambridge",
            "Works in Caltech's physics department",
        ]
    },
    {
        name: "Bernadette",
        image: "images/Bernadette.png",
        title: "Microbiologist",
        facts: [
            "Full name: Bernadette Maryann Rostenkowski-Wolowitz",
            "Earned a Ph.D. in microbiology",
            "Originally a waitress at the Cheesecake Factory",
            "Spouse: Howard Wolowitz"
        ]
    },
    {
        name: "Amy",
        image: "images/Amy.png",
        title: "Neuroscientist",
        facts: [
            "Full name: Amy Farrah Fowler",
            "Ph.D. in neurobiology",
            "Research focus: addiction in primates and invertebrates",
            "Spouse: Sheldon Cooper"
        ]
    }
];

initializeThemeSongOnFirstLoad();

// load your cleaned dataset
d3.csv("data/tbbt_cleaned_data.csv").then(data => {

    data.forEach(d => {
        d.Season = +d.Season;
        d.Episode = +d.Episode;

        // count words
        d.wordCount = d.Dialogue ? d.Dialogue.split(" ").length : 0;
    });

    globalState.data = data;

    renderCharacterGallery();
    renderOverview();
    renderCharacterCharts();
    renderEpisodeCharts();
});


function initializeThemeSongOnFirstLoad() {

    if (localStorage.getItem(THEME_SONG_FIRST_LOAD_KEY) === "true") {
        return;
    }

    let themeSong = new Audio("audio/theme_song.m4a");
    themeSong.preload = "auto";
    themeSong.volume = 0.6;

    themeSong.play()
        .then(() => {
            localStorage.setItem(THEME_SONG_FIRST_LOAD_KEY, "true");
        })
        .catch(() => {
            showThemeSongPrompt(themeSong);
        });
}


function showThemeSongPrompt(themeSong) {

    if (document.getElementById("themeSongPrompt")) {
        return;
    }

    let container = document.querySelector(".hero-copy");
    if (!container) {
        return;
    }

    let prompt = document.createElement("div");
    prompt.id = "themeSongPrompt";
    prompt.className = "theme-song-prompt";
    prompt.innerHTML = `
        <p>Click to play the theme song.</p>
        <button type="button" class="theme-song-button">Play Theme Song</button>
    `;

    let button = prompt.querySelector("button");
    button.onclick = () => {
        themeSong.play()
            .then(() => {
                localStorage.setItem(THEME_SONG_FIRST_LOAD_KEY, "true");
                prompt.remove();
            })
            .catch(() => {
                button.textContent = "Playback blocked by browser";
            });
    };

    container.appendChild(prompt);
}


// character gallery
function renderCharacterGallery() {

    let div = document.getElementById("characterGallery");

    div.innerHTML = `
        <h2>Main Characters</h2>
        <div class="character-grid"></div>
    `;

    let grid = div.querySelector(".character-grid");

    characterCards.forEach(character => {
        let card = document.createElement("article");
        card.className = "character-card";
        card.innerHTML = `
            <img src="${character.image}" alt="${character.name}">
            <div class="character-nameplate">${character.name}</div>
            <div class="character-overlay">
                <h3>${character.name}</h3>
                <p class="character-title">${character.title}</p>
                <ul class="character-facts">
                    ${character.facts.map(fact => `<li>${fact}</li>`).join("")}
                </ul>
            </div>
        `;

        grid.appendChild(card);
    });
}


// show overview
function renderOverview() {

    let div = document.getElementById("overview");

    div.innerHTML = `
        <h2>Overview</h2>
        <p><strong>Original Network:</strong> CBS</p>
        <p><strong>Run:</strong> September 24, 2007 – May 16, 2019</p>
        <p><strong>Total Episodes:</strong> 279</p>
        <p><strong>Genre:</strong> Sitcom</p>
    `;
}


// character charts
function renderCharacterCharts() {

    let div = document.getElementById("characterCharts");
    div.innerHTML = `
        <h2>Character Importance (Overall & By Season)</h2>
        <p class="chart-note">Episodes = number of unique episodes a character appears in. Speaking volume = total word count from dialogue.</p>
        <div class="season-filter">
            <label for="seasonSelect">View:</label>
            <select id="seasonSelect"></select>
        </div>
        <div id="importanceContent"></div>
    `;

    let filtered = cleanCharacterRows(globalState.data);
    let overallStats = buildCharacterStats(filtered);

    let seasons = Array.from(new Set(filtered.map(d => d.Season))).sort((a, b) => a - b);

    if (!globalState.selectedSeason) {
        globalState.selectedSeason = "overall";
    }

    if (
        globalState.selectedSeason !== "overall" &&
        !seasons.includes(+globalState.selectedSeason)
    ) {
        globalState.selectedSeason = "overall";
    }

    let seasonSelect = document.getElementById("seasonSelect");
    seasonSelect.innerHTML = [`<option value="overall">Overall</option>`]
        .concat(seasons.map(season => `<option value="${season}">Season ${season}</option>`))
        .join("");

    seasonSelect.value = String(globalState.selectedSeason);
    seasonSelect.onchange = (event) => {
        globalState.selectedSeason = event.target.value;
        renderCharacterCharts();
    };

    let importanceContent = document.getElementById("importanceContent");

    // Simple if/else: show either Overall charts or selected Season charts.
    if (globalState.selectedSeason === "overall") {
        importanceContent.innerHTML = `
            <div class="importance-section">
                <h3>Overall</h3>
                <div class="importance-grid">
                    <div>
                        <h4>Episode Appearances (Overall)</h4>
                        <div id="overallEpisodesChart"></div>
                    </div>
                    <div>
                        <h4>Word Count (Overall)</h4>
                        <div id="overallWordsChart"></div>
                    </div>
                </div>
            </div>
        `;

        renderImportanceBars(
            document.getElementById("overallEpisodesChart"),
            overallStats,
            "episodes",
            "episodes"
        );
        renderImportanceBars(
            document.getElementById("overallWordsChart"),
            overallStats,
            "words",
            "words"
        );
    } else {
        let selectedSeasonNumber = +globalState.selectedSeason;
        let seasonStats = buildCharacterStats(
            filtered.filter(d => d.Season === selectedSeasonNumber)
        );

        importanceContent.innerHTML = `
            <div class="importance-section">
                <h3>Season ${selectedSeasonNumber}</h3>
                <div class="importance-grid">
                    <div>
                        <h4>Episode Appearances (Season ${selectedSeasonNumber})</h4>
                        <div id="seasonEpisodesChart"></div>
                    </div>
                    <div>
                        <h4>Word Count (Season ${selectedSeasonNumber})</h4>
                        <div id="seasonWordsChart"></div>
                    </div>
                </div>
            </div>
        `;

        renderImportanceBars(
            document.getElementById("seasonEpisodesChart"),
            seasonStats,
            "episodes",
            "episodes"
        );
        renderImportanceBars(
            document.getElementById("seasonWordsChart"),
            seasonStats,
            "words",
            "words"
        );
    }
}


function cleanCharacterRows(data) {
    return data.filter(d =>
        d.Character &&
        MAIN_CHARACTERS.has(d.Character) &&
        !d.Character.includes("(") &&
        !d.Character.includes(")") &&
        d.Character.length < 20
    );
}


function buildCharacterStats(data) {

    let grouped = d3.group(data, d => d.Character);
    let stats = [];

    grouped.forEach((values, character) => {
        let totalWords = d3.sum(values, d => d.wordCount);
        let episodesSet = new Set(values.map(d => d.Season + "-" + d.Episode));

        stats.push({
            character: character,
            words: totalWords,
            episodes: episodesSet.size
        });
    });

    stats.sort((a, b) => b.words - a.words);
    return stats;
}


function renderImportanceBars(container, stats, metricKey, metricLabel) {

    container.innerHTML = "";

    if (!stats.length) {
        container.innerHTML = "<p>No data available.</p>";
        return;
    }

    let maxValue = d3.max(stats, d => d[metricKey]) || 1;

    stats.forEach(stat => {
        let row = document.createElement("div");
        row.className = "importance-row";

        if (globalState.selectedCharacter === stat.character) {
            row.classList.add("selected");
        }

        row.title = "Click to see episode-level details";
        row.onclick = () => {
            globalState.selectedCharacter = stat.character;
            renderEpisodeCharts();
            renderCharacterCharts();

            document.getElementById("episodeCharts").scrollIntoView({
                behavior: "smooth"
            });
        };

        let widthPercent = (stat[metricKey] / maxValue) * 100;

        row.innerHTML = `
            <div class="importance-row-label">${stat.character}</div>
            <div class="importance-row-track">
                <div class="importance-row-fill" style="width: ${widthPercent}%;"></div>
            </div>
            <div class="importance-row-value">${stat[metricKey]} ${metricLabel}</div>
        `;

        container.appendChild(row);
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