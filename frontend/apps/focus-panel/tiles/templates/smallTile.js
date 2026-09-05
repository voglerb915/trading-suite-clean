export function SmallTile({ title, body, badges = [] }) {
    return `
        <div class="cockpit-tile tile-small">
            <h3 class="tile-title">
                ${title}
                ${badges.map(b => `<span class="fp-badge ${b.class}">${b.text}</span>`).join("")}
            </h3>
            <div class="tile-body">
                ${body}
            </div>
        </div>
    `;
}
