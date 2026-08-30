import GlobalState from "../../../shared/state/globalState.js";

export function renderIndexFilterBar(containerId = 'index-filter-bar', onchangeCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Exakte 5 Universen passend zum Backend und Fokus-Panel
    const indices = [
        { symbol: 'SP500', label: 'S&P 500' },
        { symbol: 'NDX', label: 'Nasdaq 100' },
        { symbol: 'DJI', label: 'Dow Jones' },
        { symbol: 'RUT', label: 'Russell 2000' },
        { symbol: 'NONE', label: 'Other' }
    ];

    // Standard im GlobalState initialisieren, falls noch nicht gesetzt
    if (!GlobalState.get("activeIndex")) {
        GlobalState.set("activeIndex", "SP500");
    }

    const activeIndex = GlobalState.get("activeIndex");

    container.innerHTML = '';
    indices.forEach(ind => {
        const pill = document.createElement('div');
        pill.textContent = ind.label;
        pill.style.padding = '6px 12px';
        pill.style.borderRadius = '16px';
        pill.style.fontSize = '12px';
        pill.style.cursor = 'pointer';
        pill.style.userSelect = 'none';
        pill.style.transition = 'all 0.2s';

        const isActive = activeIndex === ind.symbol;
        if (isActive) {
            pill.style.background = '#4ea8de';
            pill.style.color = '#121212';
            pill.style.fontWeight = 'bold';
        } else {
            pill.style.background = '#2a2a2a';
            pill.style.color = '#ccc';
        }

        pill.addEventListener('click', () => {
            GlobalState.set("activeIndex", ind.symbol);
            
            // UI neu rendern, damit sich die Farben der Pillen aktualisieren
            renderIndexFilterBar(containerId, onchangeCallback); 
            
            // Den im Orchestrator übergebenen Callback ausführen (lädt das Stock Quadrant neu)
            if (typeof onchangeCallback === 'function') {
                onchangeCallback();
            }
        });

        container.appendChild(pill);
    });
}