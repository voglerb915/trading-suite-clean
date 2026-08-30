import { renderStocksList } from "../lists/stocksList/renderStocksList.js";

export function renderDashboardStocks(stocks, state) {
    console.log("🔍 VIEW: renderDashboardStocks aufgerufen mit stocks.length:", stocks ? stocks.length : "NULL");

    const container = document.querySelector("#stocks-list-container");
    if (!container) {
        console.error("❌ FEHLER: Container #stocks-list-container nicht gefunden!");
        return;
    }

    // Dashboard rendert NUR – keine Filterung hier!
    renderStocksList(stocks, state);

    console.log("✅ VIEW: Liste erfolgreich gerendert.");
}
