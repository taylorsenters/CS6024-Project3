// global state
let globalState = {
    data: [],
    selectedCharacter: null
};

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
});


// character gallery
function renderCharacterGallery() {

    let div = document.getElementById("characterGallery");

    div.innerHTML = `
        <h2>Main Characters</h2>
        <p class="gallery-note">Hover over each character to see key character facts.</p>
        <div class="character-grid"></div>
    `;

    let grid = div.querySelector(".character-grid");

    characterCards.forEach(character => {
        let card = document.createElement("article");
        card.className = "character-card";
        card.innerHTML = `
            <img src="${character.image}" alt="${character.name}">
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
        <p><strong>Series:</strong> The Big Bang Theory</p>
        <p><strong>Run:</strong> September 24, 2007 – May 16, 2019</p>
        <p><strong>Total Episodes:</strong> 279</p>
        <p><strong>Genre:</strong> Sitcom</p>
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