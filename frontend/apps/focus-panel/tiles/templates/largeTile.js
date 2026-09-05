export function LargeTile({ title, sections, badges = [] }) {
    return `
        <div class="cockpit-tile tile-large">
            <h3 class="tile-title">
                ${title}
                ${badges.map(b => `<span class="fp-badge ${b.class}">${b.text}</span>`).join("")}
            </h3>

            ${sections.map(sec => `
                <div class="tile-section">
                    <div class="section-label">${sec.label}</div>
                    <div class="section-content">${sec.content}</div>
                </div>
            `).join("")}
        </div>
    `;
}
