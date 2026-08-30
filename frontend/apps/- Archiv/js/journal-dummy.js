//import GlobalState from "../../shared/state/globalState.js";
//import { getExecutedTrades } from "../../shared/api/journal.js";
//import { renderJournalTable } from "./render/renderJournalTable.js";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const root = document.getElementById("journal-root");
        if (root) {
            root.innerHTML = `
                <div style="padding: 20px; font-family: monospace;">
                    <h3>Journal Modul in Vorbereitung</h3>
                    <p style="color: #666;">Backend-Dummy aktiv. Tabellen-Renderer folgt demnächst.</p>
                </div>
            `;
        }
        console.log("Journal Dummy Frontend aktiv (ohne fehlende Imports).");
    } catch (err) { // bzw. catch (err)
        console.error("Journal Init Error:", err);
    }
});
