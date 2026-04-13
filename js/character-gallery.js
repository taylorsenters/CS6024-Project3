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
