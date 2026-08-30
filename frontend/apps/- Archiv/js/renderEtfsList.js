export function renderEtfsList(etfs, container) {
    container.innerHTML = "";

    if (!etfs || etfs.length === 0) {
        container.innerHTML = "<p>Keine ETF-Daten verfügbar.</p>";
        return;
    }

    etfs.forEach(etf => {
        if (!etf) return;

        const row = document.createElement("div");
        row.className = "etf-row";

        // 🟢 Exakt laut Screenshot:
        const ticker = etf.ticker || "—";       
        const companyName = etf.name || "—";     
        
        // 🟢 Rank heißt laut Screenshot: rankWonDb
        const rank = etf.rankWonDb !== undefined ? etf.rankWonDb : "—";

        // 🟢 Score heißt laut Screenshot: score
        let score = "—";
        if (etf.score !== undefined && etf.score !== null) {
            const parsedScore = Number(String(etf.score).replace(",", "."));
            score = !isNaN(parsedScore) ? parsedScore.toFixed(2) : "—";
        }

        row.innerHTML = `
            <div class="etf-left">
                <div class="etf-ticker">${ticker}</div>
                <div class="etf-name">${companyName}</div>
            </div>

            <div class="etf-right">
                <div class="etf-rank">Rank: ${rank}</div>
                <div class="etf-score">Score: ${score}</div>
            </div>
        `;

        row.onclick = () => {
            if (typeof window.openChartModal === "function") {
                window.openChartModal(ticker);
            }
        };

        container.appendChild(row);
    });
}