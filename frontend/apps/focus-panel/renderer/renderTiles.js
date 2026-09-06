// focus-panel/renderer/renderTiles.js

export function renderTiles(tiles) {
    const container = document.getElementById("tile-container");
    if (!container) return;

    // Alle Tiles hintereinander in denselben Container
    container.innerHTML = tiles.join("");
}
