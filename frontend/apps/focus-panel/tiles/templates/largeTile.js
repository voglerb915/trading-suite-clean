export function LargeTile({ title, sections, badges = [] }) {
    const wrapper = document.createElement("div");
    wrapper.className = "cockpit-tile tile-large";

    // Title
    const h3 = document.createElement("h3");
    h3.className = "tile-title";
    h3.innerHTML = title + badges.map(b => 
        `<span class="fp-badge ${b.class}">${b.text}</span>`
    ).join("");
    wrapper.appendChild(h3);

    // Sections
    sections.forEach(sec => {
        const sectionEl = document.createElement("div");
        sectionEl.className = "tile-section";

        const labelEl = document.createElement("div");
        labelEl.className = "section-label";
        labelEl.textContent = sec.label;

        const contentEl = document.createElement("div");
        contentEl.className = "section-content";
        contentEl.innerHTML = sec.content;   // ⭐ WICHTIG: HTML, nicht Text

        sectionEl.appendChild(labelEl);
        sectionEl.appendChild(contentEl);
        wrapper.appendChild(sectionEl);
    });

    return wrapper.outerHTML;
}
