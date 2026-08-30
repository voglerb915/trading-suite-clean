export function renderSignalsPills(count, state) {
    const pillContainer = document.getElementById("tools-pill-container");
    if (!pillContainer) return;

    const longActive = state.phaseLong && state.phaseLong !== "all";
    const exitActive = state.phaseExit && state.phaseExit !== "all";
    const currentDays = state?.daysInTrend ?? ""; 
    const daysActive = currentDays !== "" && currentDays != null;

    pillContainer.innerHTML = `
        <span class="pill pill-count">${count}</span>
        <span class="pill pill-buy ${state.filterBuySignals ? 'active' : ''}" data-type="filterBuySignals">B</span>
        <span class="pill pill-sell ${state.filterSellSignals ? 'active' : ''}" data-type="filterSellSignals">S</span>
        
        <!-- Long Pille mit Dropdown -->
        <div class="pill-dropdown-wrapper" style="position: relative; display: inline-block;">
            <span class="pill pill-long ${longActive ? 'active' : ''}">
                L <span class="dropdown-arrow">▼</span>
            </span>
            <div class="pill-dropdown-menu" id="long-phase-dropdown" style="display: none; position: absolute; z-index: 1000; background: #222; border: 1px solid #444; padding: 4px 0; min-width: 140px;">
                <div class="dropdown-item ${state.phaseLong === 'all' ? 'selected' : ''}" data-phase-type="long" data-phase-value="all">Alle Phasen (Aus)</div>
                <div class="dropdown-item ${state.phaseLong === 'all_long' ? 'selected' : ''}" data-phase-type="long" data-phase-value="all_long">Alle Longs</div>
                <div class="dropdown-divider" style="height: 1px; background: #444; margin: 4px 0;"></div>
                ${[1,2,3,4,5,6].map(p => `
                    <div class="dropdown-item ${state.phaseLong === String(p) ? 'selected' : ''}"
                         data-phase-type="long"
                         data-phase-value="${p}">
                        Phase ${p}
                    </div>
                `).join("")}
            </div>
        </div>

        <!-- Exit Pille mit Dropdown -->
        <div class="pill-dropdown-wrapper" style="position: relative; display: inline-block;">
            <span class="pill pill-exit ${exitActive ? 'active' : ''}">
                E <span class="dropdown-arrow">▼</span>
            </span>
            <div class="pill-dropdown-menu" id="exit-phase-dropdown" style="display: none; position: absolute; z-index: 1000; background: #222; border: 1px solid #444; padding: 4px 0; min-width: 140px;">
                <div class="dropdown-item ${state.phaseExit === 'all' ? 'selected' : ''}" data-phase-type="exit" data-phase-value="all">Alle Phasen (Aus)</div>
                <div class="dropdown-item ${state.phaseExit === 'all_exit' ? 'selected' : ''}" data-phase-type="exit" data-phase-value="all_exit">Alle Exits</div>
                <div class="dropdown-divider" style="height: 1px; background: #444; margin: 4px 0;"></div>
                ${[1,2,3,4,5,6].map(p => `
                    <div class="dropdown-item ${state.phaseExit === String(p) ? 'selected' : ''}"
                         data-phase-type="exit"
                         data-phase-value="${p}">
                        Phase ${p}
                    </div>
                `).join("")}
            </div>
        </div>

        <!-- Days Pille mit Dropdown (angepasst im Long/Exit-Stil) -->
        <div class="pill-dropdown-wrapper" style="position: relative; display: inline-block; margin-left: 2px;">
            <span class="pill pill-days ${daysActive ? 'active' : ''}">
                D <span class="dropdown-arrow">▼</span>
            </span>
            <div class="pill-dropdown-menu" id="days-phase-dropdown" style="display: none; position: absolute; z-index: 1000; background: #222; border: 1px solid #444; padding: 4px 0; min-width: 120px;">
                <div class="dropdown-item ${!currentDays || currentDays === '' ? 'selected' : ''}" data-days-type="days" data-days-value="">Alle</div>
                <div class="dropdown-divider" style="height: 1px; background: #444; margin: 4px 0;"></div>
                ${[1,2,3,4,5].map(d => `
                    <div class="dropdown-item ${String(currentDays) === String(d) ? 'selected' : ''}"
                         data-days-type="days"
                         data-days-value="${d}">
                        ${d}
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}