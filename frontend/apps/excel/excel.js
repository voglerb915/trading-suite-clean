import { calculateRanking } from "../../shared/logic/calculateRanking.js";
import { loadExcelRawData } from "../../shared/logic/loadExcelRawData.js";

// SECTORS
import { renderSectorsPerformance } from "./js/renderSectorsPerformance.js";
import { renderSectorsRanking } from "./js/renderSectorsRanking.js";

// INDUSTRIES
import { renderIndustriesPerformance } from "./js/renderIndustriesPerformance.js";
import { renderIndustriesRanking } from "./js/renderIndustriesRanking.js";
import { renderIndustriesTop20 } from "./js/renderIndustriesTop20.js";

// SECTORS OVERVIEW
import { renderSectorsOverview } from "./js/renderSectorsOverview.js";
import { exportOverviewHTML } from "./js/helpers/exportOverviewHTML.js";


// ---------------------------------------------------------
// MAIN
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    console.log("EXCEL: Start...");

    const { sectors, industries, dates } = await loadExcelRawData();

    const rankingSectors = calculateRanking(sectors);
    const rankingIndustries = calculateRanking(industries);

    Object.keys(rankingIndustries).forEach(ind => {
        rankingIndustries[ind].sector = industries[ind].sector;
    });

    renderSectorsPerformance("tab-sectors-performance", sectors, dates);
    renderSectorsRanking("tab-sectors-ranking", sectors, rankingSectors, dates);

    renderIndustriesPerformance("tab-industries-performance", industries, dates);
    renderIndustriesRanking("tab-industries-ranking", industries, rankingIndustries, dates);

    renderIndustriesTop20("tab-industries-top20", industries, rankingIndustries, dates);

    renderSectorsOverview("tab-sectors-overview", sectors, industries);


    // -----------------------------------------------------
    // TAB-LOGIK
    // -----------------------------------------------------
document.querySelectorAll(".tab").forEach(tabEl => {
    tabEl.addEventListener("click", (e) => {
        const target = e.target;

        // 1) Export nur beim Icon
        if (target.classList.contains("tab-icon-export")) {
            exportOverviewHTML("tab-sectors-overview");
            return;
        }


        // 2) Tab-Wechsel bei Klick auf Text oder Tab-Fläche
        const tab = tabEl.dataset.tab;

        document.querySelectorAll(".tab").forEach(btn => btn.classList.remove("active"));
        tabEl.classList.add("active");

        document.querySelectorAll(".tab-content").forEach(div => {
            div.style.display = "none";
        });

        const targetTab = document.getElementById(`tab-${tab}`);
        if (targetTab) {
            targetTab.style.display = "block";
        }
    });
});

    // -----------------------------------------------------
    // EXPORT-BUTTON (falls vorhanden)
    // -----------------------------------------------------
    const btn = document.getElementById("btn-export-overview");
    if (btn) {
        btn.addEventListener("click", () => {
            exportOverviewHTML("tab-sectors-overview");
        });
    }
});
