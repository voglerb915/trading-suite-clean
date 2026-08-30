import { JournalView } from './js/journalView.js';
import { JournalTable } from './js/journalTable.js';
import { JournalAnalytics } from './js/journalAnalytics.js';

class JournalApp {
    constructor() {
        this.rootElement = document.getElementById('journal-root');
        this.data = [];

        // Komponenten initialisieren
        this.view = new JournalView(this.rootElement);
    }

    async init() {
        // 1. Layout ins DOM rendern
        this.view.renderLayout();

        // 2. Sub-Komponenten an die Container im Layout binden
        const tbodyEl = document.getElementById('journal-tbody');
        const analyticsEl = document.getElementById('analytics-content');

        this.tableRenderer = new JournalTable(tbodyEl, (item) => this.handleRowSelect(item));
        this.analyticsRenderer = new JournalAnalytics(analyticsEl);

        // 3. Daten laden
        await this.loadData();
    }

    async loadData() {
        try {
            const response = await fetch('/api/journal/executed');
            if (!response.ok) throw new Error('Netzwerkfehler beim Laden');

            this.data = await response.json();

// 🛠️ Sortierung: Primär nach Zeit (absteigend), sekundär nach execution_id (absteigend)
            this.data.sort((a, b) => {
                const timeA = new Date(a.execution_time || 0).getTime();
                const timeB = new Date(b.execution_time || 0).getTime();

                if (timeB !== timeA) {
                    return timeB - timeA; // Neueste Zeit zuerst
                }
                
                // Sekundär: Bei identischem Timestamp entscheidet die echte execution_id (höhere ID = neuer)
                return Number(b.execution_id || 0) - Number(a.execution_id || 0);
            });

            // 1. Nur für die Tabelle filtern
            const executedOnlyData = this.data.filter(item => item.order_status === 'EXECUTED');
            this.tableRenderer.render(executedOnlyData);

            // 2. Analytics erhält die ungedeckten Gesamtdaten für die Übersicht
            this.analyticsRenderer.renderOverview(this.data);

        } catch (err) {
            console.error('Fehler:', err);
            document.getElementById('journal-tbody').innerHTML = `<tr><td colspan="8" style="color: #e74c3c; text-align: center; padding: 20px;">Fehler beim Laden der Daten.</td></tr>`;
        }
    }

    handleRowSelect(item) {
        // Wenn ein Trade angeklickt wird, rendert der Analytics-Renderer die Details
        this.analyticsRenderer.renderDetail(item, () => {
            // Callback für den "Zurück"-Button
            this.analyticsRenderer.renderOverview(this.data);
        });
    }
}

// App starten beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    const app = new JournalApp();
    app.init();
});