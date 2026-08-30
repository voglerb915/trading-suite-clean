import { getSectorClass, getDiffColor, formatDiff, renderRankCircle } from "../../../helpers/renderHelpers.js";

function normalizeSectorSignal(sig) {
    if (!sig) return null;
    if (typeof sig.signal === "string") return { signal: sig.signal };
    if (typeof sig.entry === "number" || typeof sig.exit === "number") {
        if (sig.entry > 0) return { signal: "entry" };
        if (sig.exit  > 0) return { signal: "exit" };
    }
    if (typeof sig.long === "number" || typeof sig.short === "number") {
        if (sig.long  > 0) return { signal: "entry" };
        if (sig.short > 0) return { signal: "exit" };
    }
    if (Array.isArray(sig.signals)) {
        if (sig.signals.includes("entry")) return { signal: "entry" };
        if (sig.signals.includes("exit"))  return { signal: "exit" };
    }
    return null;
}

export function renderSectorItem(item, state, sparkSectors) {
    const isSelected = item.sector === state.sector;
    const score = (item.rsScore ?? 0).toFixed(2);

    const count = (state.stocks || []).filter(s => {
        const stockSector = s.sector || s.sector_name;
        return stockSector === item.sector;
    }).length;

    const normalizedSignal = normalizeSectorSignal(sparkSectors[item.sector]);

    return `
        <div class="grid-row-sector stock-item ${isSelected ? 'highlight-sector' : ''}"
             data-sector="${item.sector}">

            <div class="grid-cell ${getSectorClass(item.sector)}">
              ${renderRankCircle(item.rsRank, normalizedSignal)}
              ${isSelected ? '▶ ' : ''}${item.sector} (${score})
            </div>

            <div class="grid-cell count-cell">[${count}]</div>

            <div class="grid-cell" style="color:${getDiffColor(item.diffW)};">
                ${formatDiff(item.diffW)}
            </div>

            <div class="grid-cell" style="color:${getDiffColor(item.diffM)};">
                ${formatDiff(item.diffM)}
            </div>

            <div class="grid-cell" style="color:${getDiffColor(item.diffQ)};">
                ${formatDiff(item.diffQ)}
            </div>
        </div>
    `;
}