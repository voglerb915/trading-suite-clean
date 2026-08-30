/*----------------------------------
1. Globaler State
----------------------------------*/
const GlobalState = {
    data: [],
    selectedTicker: null,
    view: 'overview' // Standard-Ansicht im Dashboard
};

/*----------------------------------
2. Data-Layer
----------------------------------*/
async function loadDashboardData() {
    try {
        // Pfad zu deiner API (anpassen falls nötig)
        const res = await fetch("/api/volume-metrics"); 
        if (!res.ok) throw new Error("Dashboard-Daten konnten nicht geladen werden");

        const data = await res.json();
        GlobalState.data = data;
        
        renderDashboardOverview(data);
        return data;
    } catch (err) {
        console.error("Fehler im Dashboard Data-Layer:", err);
        return [];
    }
}

/*----------------------------------
3. Navigation (Dashboard-Interne Ansichten)
----------------------------------*/
function switchDashboardView(viewId) {
    console.log("Dashboard Ansicht wechseln zu:", viewId);
    GlobalState.view = viewId;
    
    // Hier könntest du zwischen verschiedenen Dashboard-Tabs umschalten
    // z.B. Overview, Sektoren, Analyse
}

/*----------------------------------
4. UI-Layer (Rendering)
----------------------------------*/
function renderDashboardOverview(data) {
    const container = document.getElementById("dashboard-content"); // Deine ID in index.html
    if (!container) return;

    // Beispiel: Eine einfache Kachel-Ansicht der Top-Performer
    const topPerformers = data
        .filter(item => item.ratio > 2)
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 8); // Nur die Top 8

    container.innerHTML = `
        <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; padding: 20px;">
            ${topPerformers.map(item => `
                <div class="dash-card" data-ticker="${item.ticker}" 
                     style="background: #1e1e1e; border: 1px solid #333; padding: 15px; border-radius: 8px; cursor: pointer;">
                    <div style="color: #ffa500; font-weight: bold; font-size: 1.2rem;">${item.ticker}</div>
                    <div style="font-size: 0.9rem; color: #ccc; margin-top: 5px;">Ratio: ${Number(item.ratio).toFixed(1)}x</div>
                    <div style="font-size: 1.1rem; margin-top: 10px;">${item.close ? item.close.toFixed(2) : '---'} $</div>
                </div>
            `).join('')}
        </div>
    `;

    // Click-Handler für die Kacheln
    container.querySelectorAll('.dash-card').forEach(card => {
        card.addEventListener('click', () => {
            handleDashboardClick(card.getAttribute('data-ticker'));
        });
    });
}

/*----------------------------------
5. Controller
----------------------------------*/
async function initDashboardSync() {
    await loadDashboardData();
    // Hier könnten später Intervalle für Live-Updates rein
}

/*----------------------------------
6. Event-Handler
----------------------------------*/
function handleDashboardClick(ticker) {
    console.log("Dashboard-Detail für:", ticker);
    GlobalState.selectedTicker = ticker;
    // Aktion: Öffne z.B. Spalte 2 mit Chart-Details
}

/*----------------------------------
7. Initialisierung
----------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
    console.log("New Dashboard initialisiert...");
    
    // Initialer Daten-Sync
    initDashboardSync();
});