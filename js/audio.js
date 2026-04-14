
function initializeThemeSongOnFirstLoad() {

    let themeSong = new Audio("audio/theme_song.m4a");
    themeSong.preload = "auto";
    themeSong.volume = 0.6;

    renderThemeSongButton(themeSong);

    // Attempt autoplay only on the very first page load
    if (localStorage.getItem(THEME_SONG_FIRST_LOAD_KEY) !== "true") {
        themeSong.play()
            .then(() => {
                localStorage.setItem(THEME_SONG_FIRST_LOAD_KEY, "true");
                updateThemeSongButton(themeSong);
            })
            .catch(() => {
            });
    }
}

function renderThemeSongButton(themeSong) {

    if (document.getElementById("themeSongPrompt")) return;

    let container = document.querySelector(".hero-copy");
    if (!container) return;

    let prompt = document.createElement("div");
    prompt.id = "themeSongPrompt";
    prompt.className = "theme-song-prompt";
    prompt.innerHTML = `
        <p id="themeSongLabel">Click to play the theme song.</p>
        <button type="button" class="theme-song-button" id="themeSongBtn">▶ Play Theme Song</button>
    `;

    container.appendChild(prompt);

    let btn = prompt.querySelector("#themeSongBtn");
    btn.onclick = () => toggleThemeSong(themeSong);

    // Keep button label in sync when the song ends naturally
    themeSong.addEventListener("ended", () => updateThemeSongButton(themeSong));
}

function toggleThemeSong(themeSong) {

    if (themeSong.paused) {
        themeSong.play()
            .then(() => {
                localStorage.setItem(THEME_SONG_FIRST_LOAD_KEY, "true");
                updateThemeSongButton(themeSong);
            })
            .catch(() => {
                let btn = document.getElementById("themeSongBtn");
                if (btn) btn.textContent = "Playback blocked by browser";
            });
    } else {
        themeSong.pause();
        updateThemeSongButton(themeSong);
    }
}

function updateThemeSongButton(themeSong) {

    let btn = document.getElementById("themeSongBtn");
    let label = document.getElementById("themeSongLabel");
    if (!btn) return;

    if (themeSong.paused || themeSong.ended) {
        btn.textContent = "▶ Play Theme Song";
        if (label) label.textContent = "Click to play the theme song.";
    } else {
        btn.textContent = "⏸ Pause";
        if (label) label.textContent = "Theme song is playing.";
    }
}
