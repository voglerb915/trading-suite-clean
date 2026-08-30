export function LargeTile({ title, sections }) {
    return `
        <div class="cockpit-tile tile-large">
            <h3 class="tile-title">${title}</h3>

            ${sections.map(sec => `
                <div class="tile-section">
                    <div class="section-label">${sec.label}</div>
                    <div class="section-content">${sec.content}</div>
                </div>
            `).join("")}
        </div>
    `;
}
