import { sectorClasses } from "/shared/logic/sectorColors.js";
import { renderRankCircle } from "../../../helpers/renderHelpers.js";


export function renderWatchlistItem(item, state) {
    const isSelected = item.ticker === state?.ticker;
    const displayStrategy = item.strategy_name ?? "none";
    
    let formattedDate = "—";
    if (item.added_at) {
        const dateObj = new Date(item.added_at);
        if (!isNaN(dateObj)) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            formattedDate = `${day}.${month}.${year}, ${hours}:${minutes}`;
        }
    }

    const tr = document.createElement("tr");
    tr.className = `watchlist-row ${isSelected ? 'highlight-ticker' : ''}`;
    tr.setAttribute("data-stock", item.ticker);
    tr.setAttribute("data-id", item.id);

    const hasNotes = item.user_notes && item.user_notes.trim() !== "";
    const noteIconClass = hasNotes ? "clickable-icon note-icon has-notes" : "clickable-icon note-icon";
    const iconStyleClass = hasNotes ? "fa-solid fa-note-sticky" : "fa-regular fa-note-sticky";

    tr.innerHTML = `
        <td>
            <!-- Nutzt die Kreis-Optik direkt in der Tabellenzelle -->
            ${renderRankCircle(item.id, window.dataStore?.sparkSignals?.stocks?.[item.ticker])}
        </td>
        <td>
            <strong>${item.ticker}</strong>
            <span class="${noteIconClass}" data-id="${item.id}" data-ticker="${item.ticker}" title="Notizen öffnen">
                <i class="${iconStyleClass}"></i>
            </span>
        </td>
        <td class="col-oc">
            <button class="icon-btn cart-btn" data-id="${item.id}" title="Order-Entwurf erstellen">
                <i class="fa-solid fa-cart-shopping"></i>
            </button>
        </td>
        <td>
            <span class="clickable-text strategy-text" 
                data-id="${item.id}" 
                data-strategy="${item.strategy_name ?? 'none'}" 
                title="Strategie ändern">
                <i class="fa-solid fa-pen-to-square"></i> ${displayStrategy}
            </span>
        </td>
        <td>${formattedDate}</td>
        <td class="col-del">
            <button class="icon-btn delete-btn" data-id="${item.id}" title="Eintrag löschen">
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
    `;

    return tr;
}