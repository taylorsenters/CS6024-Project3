function renderCharacterGallery() {

    let div = document.getElementById("characterGallery");
    div.innerHTML = `
        <h2>Main Characters</h2>
        <p class="gallery-note">Click a character card to filter the charts below.</p>
        <div class="character-grid"></div>
    `;

    let grid = div.querySelector(".character-grid");

    characterCards.forEach(character => {
        let card = document.createElement("article");
        card.className = "character-card";
        card.dataset.character = character.name;

        if (globalState.selectedCharacter === character.name) {
            card.classList.add("selected");
        }

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

        card.addEventListener("click", () => {
            let alreadySelected = globalState.selectedCharacter === character.name;

            // Toggle: clicking the selected character clears the filter
            globalState.selectedCharacter = alreadySelected ? null : character.name;
            globalState.selectedEpisodeKeys = new Set();

            // Update selected ring on all cards without a full re-render
            document.querySelectorAll(".character-card").forEach(c => {
                c.classList.toggle("selected", c.dataset.character === globalState.selectedCharacter);
            });

            renderCharacterCharts();
            renderEpisodeCharts();

            if (globalState.selectedCharacter) {
                document.getElementById("characterCharts").scrollIntoView({ behavior: "smooth" });
            }
        });

        grid.appendChild(card);
    });
}
