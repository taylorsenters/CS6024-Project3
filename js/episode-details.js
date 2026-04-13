function renderEpisodeCharts() {

    let div = document.getElementById("episodeCharts");

    div.innerHTML = "<h2>Episode Details</h2>";

    if (!globalState.selectedCharacter) {
        div.innerHTML += "<p>click a character</p>";
        return;
    }

    div.innerHTML += "<h3>Selected: " + globalState.selectedCharacter + "</h3>";
    div.innerHTML += "<p>Click an episode bar to generate a word cloud for that episode.</p>";

    div.innerHTML += `
        <div class="episode-details-layout">
            <div id="episodeBarsPanel"></div>
            <div class="word-cloud-panel">
                <h3 id="wordCloudTitle">Word Cloud</h3>
                <div id="wordCloudContent" class="word-cloud-content">
                    <p class="word-cloud-placeholder">Select an episode to view spoken-word frequency.</p>
                </div>
            </div>
        </div>
    `;

    let data = globalState.data.filter(d =>
        d.Character === globalState.selectedCharacter
    );

    let grouped = d3.group(data, d => d.Season + "-" + d.Episode);
    let episodeArray = Array.from(grouped);

    episodeArray.sort((a, b) => {
        let [s1, e1] = a[0].split("-").map(Number);
        let [s2, e2] = b[0].split("-").map(Number);

        if (s1 !== s2) return s1 - s2;
        return e1 - e2;
    });

    episodeArray = episodeArray.slice(0, 25);

    let barsPanel = document.getElementById("episodeBarsPanel");

    let episodeExists = episodeArray.some(([ep]) => ep === globalState.selectedEpisodeKey);
    if (!episodeExists) {
        globalState.selectedEpisodeKey = null;
    }

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

        if (globalState.selectedEpisodeKey === ep) {
            bar.classList.add("episode-selected");
        }

        bar.onclick = () => {
            globalState.selectedEpisodeKey = ep;
            renderEpisodeCharts();
            renderEpisodeWordCloud(values, season, episode);
        };

        barsPanel.appendChild(bar);
    });

    if (globalState.selectedEpisodeKey) {
        let selectedEntry = episodeArray.find(([ep]) => ep === globalState.selectedEpisodeKey);
        if (selectedEntry) {
            let [ep, values] = selectedEntry;
            let [season, episode] = ep.split("-");
            renderEpisodeWordCloud(values, season, episode);
        }
    }
}


function renderEpisodeWordCloud(episodeRows, season, episode) {

    let title = document.getElementById("wordCloudTitle");
    let container = document.getElementById("wordCloudContent");

    if (!title || !container) {
        return;
    }

    title.textContent = "Word Cloud - Season " + season + " Episode " + episode;
    container.innerHTML = "";

    let frequencies = buildWordFrequency(episodeRows);

    if (!frequencies.length) {
        container.innerHTML = "<p class=\"word-cloud-placeholder\">No dialogue words available for this episode.</p>";
        return;
    }

    let maxCount = frequencies[0].count;

    frequencies.forEach(item => {
        let span = document.createElement("span");
        span.className = "word-chip";
        span.textContent = item.word;
        span.title = item.word + ": " + item.count;

        let size = 12 + (item.count / maxCount) * 24;
        span.style.fontSize = size.toFixed(1) + "px";

        container.appendChild(span);
    });
}


function buildWordFrequency(rows) {

    let STOP_WORDS = new Set([
        "the", "and", "for", "that", "this", "with", "you", "your", "are", "was", "were", "but", "have", "has", "had", "not", "from", "they", "them", "their", "there", "then", "what", "when", "where", "who", "whom", "will", "would", "could", "should", "about", "into", "just", "like", "really", "very", "also", "than", "because", "been", "being", "over", "some", "more", "much", "such", "only", "even", "dont", "didnt", "cant", "im", "ive", "its", "our", "out", "him", "her", "his", "she", "he", "theyre", "we", "us", "my", "me", "i", "a", "an", "to", "of", "in", "on", "at", "is", "it", "be", "or", "as", "by", "if", "so", "no", "yes"
    ]);

    let counts = new Map();

    rows.forEach(row => {
        let text = (row.Dialogue || "")
            .toLowerCase()
            .replace(/[^a-z\s']/g, " ");

        text.split(/\s+/)
            .map(word => word.replace(/^'+|'+$/g, ""))
            .filter(word => word.length > 2 && !STOP_WORDS.has(word))
            .forEach(word => {
                counts.set(word, (counts.get(word) || 0) + 1);
            });
    });

    return Array.from(counts.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 60);
}
