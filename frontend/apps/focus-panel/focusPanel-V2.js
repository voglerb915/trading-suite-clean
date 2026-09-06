// apps/focus-panel/focusPanel.js
import { SectorOverviewTile } from './tiles/instances/sectorOverviewTile.js';
import { IndustryOverviewTile } from './tiles/instances/industryOverviewTile.js';
import { StockOverviewTile } from './tiles/instances/stockOverviewTile.js';
import "@shared/css/sector.css";


async function initFocusPanel() {
    const container = document.getElementById('tile-container');
    if (!container) return;

    container.innerHTML = `<div style="color: #888; font-size: 0.9rem;">Lade Focus Panel...</div>`;

    try {
        const [
            sectorTile, industryTile, spTile, ndxTile, djiTile, rutTile, noneTile
        ] = await Promise.all([
            SectorOverviewTile(),
            IndustryOverviewTile(),
            StockOverviewTile('SP500', 'S&P 500'),
            StockOverviewTile('NDX', 'Nasdaq 100'),
            StockOverviewTile('DJI', 'Dow Jones'),
            StockOverviewTile('RUT', 'Russell 2000'),
            StockOverviewTile('NONE', 'Other Stocks')
        ]);

        container.innerHTML = `
            <!-- Spalte 1: Sektor & Industries -->
            <div style="display: flex; flex-direction: column; gap: 15px;">
                ${sectorTile}
                ${industryTile}
            </div>
            <!-- Spalte 2: S&P 500 -->
            <div>
                ${spTile}
            </div>
            <!-- Spalte 3: Nasdaq & Dow -->
            <div style="display: flex; flex-direction: column; gap: 15px;">
                ${ndxTile}
                ${djiTile}
            </div>
            <!-- Spalte 4: Russell 2000 -->
            <div>
                ${rutTile}
            </div>
            <!-- Spalte 5: Other Stocks -->
            <div>
                ${noneTile}
            </div>
        `;

    } catch (err) {
        console.error("Fehler beim Initialisieren des Focus Panels:", err);
        container.innerHTML = `<div style="color: #f44336;">Fehler beim Laden.</div>`;
    }
}

document.addEventListener("DOMContentLoaded", initFocusPanel);