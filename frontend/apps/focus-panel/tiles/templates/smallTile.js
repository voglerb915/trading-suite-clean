export function SmallTile({ title, body, badges = [] }) {
    const wrapper = document.createElement("div");
    wrapper.className = "cockpit-tile tile-small";

    // Title
    const h3 = document.createElement("h3");
    h3.className = "tile-title";
    h3.innerHTML = title + badges.map(b =>
        `<span class="fp-badge ${b.class}">${b.text}</span>`
    ).join("");
    wrapper.appendChild(h3);

    // Body (HTML!)
    const bodyEl = document.createElement("div");
    bodyEl.className = "tile-body";
    bodyEl.innerHTML = body;   // ⭐ WICHTIG: HTML, nicht Text
    wrapper.appendChild(bodyEl);

    return wrapper.outerHTML;
}
