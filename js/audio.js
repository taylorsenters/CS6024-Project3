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
