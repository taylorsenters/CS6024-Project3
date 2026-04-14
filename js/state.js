// shared app state and data helpers
let globalState = {
    data: [],
    selectedCharacter: null,
    selectedSeason: "overall",   // shared by both character importance and episode details
    selectedEpisodeKeys: new Set()
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
            "Works in Caltech's physics department"
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

function loadAndPrepareData() {
    return d3.csv("data/tbbt_cleaned_data.csv").then(data => {
        data.forEach(d => {
            d.Season = +d.Season;
            d.Episode = +d.Episode;
            d.wordCount = d.Dialogue ? d.Dialogue.split(" ").length : 0;
        });

        globalState.data = data;
    });
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
