// /shared/logic/renderNameWithBar.js
import { sectorClasses } from "@shared/logic/sectorClasses.js";

export function renderColorBar(sectorName) { 
    const cssClass = sectorClasses[sectorName] || "";
    return `<span class="sector-bar ${cssClass}"></span>`;
}

export function renderNameWithBar(name) {
    return `
        <span style="
            display:flex;
            align-items:center;
            gap:6px;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
            max-width:200px;
        ">
            ${renderColorBar(name)}
            <span>${name}</span>
        </span>
    `;
}