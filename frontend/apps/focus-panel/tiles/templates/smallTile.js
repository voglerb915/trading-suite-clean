export function SmallTile({ title, body }) {
    return `
        <div class="cockpit-tile tile-small">
            <h3 class="tile-title">${title}</h3>
            <div class="tile-body">
                ${body}
            </div>
        </div>
    `;
}
