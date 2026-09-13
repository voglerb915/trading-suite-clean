export function renderSignalsPills(count, state) {
    const pillContainer = document.getElementById("tools-pill-container");
    if (!pillContainer) return;

    // ⭐ Neuer MID-State
    const longActive = state.mid.long.active;
    const longMode   = state.mid.long.mode;

    const exitActive = state.mid.exit.active;
    const exitMode   = state.mid.exit.mode;

    const currentDays = state?.daysInTrend ?? ""; 
    const daysActive = currentDays !== "" && currentDays != null;

    pillContainer.innerHTML = `
        <span class="pill pill-count">${count}</span>
        <span class="pill pill-buy ${state.filterBuySignals ? 'active' : ''}" data-type="filterBuySignals">B</span>
        <span class="pill pill-sell ${state.filterSellSignals ? 'active' : ''}" data-type="filterSellSignals">S</span>
        
        <!-- Long Pille -->
        <div class="pill-dropdown-wrapper" style="position: relative; display: inline-block;">
            <span class="pill pill-long ${longActive ? 'active' : ''}">
                L <span class="dropdown-arrow">▼</span>
            </span>
            <div class="pill-dropdown-menu" id="long-phase-dropdown" style="display: none;">
                <div class="dropdown-item ${!longActive ? 'selected' : ''}" 
                     data-mid-type="long" data-mid-active="false" data-mid-mode="null">
                    Aus
                </div>
                <div class="dropdown-item ${(longActive && longMode === 'all') ? 'selected' : ''}" 
                     data-mid-type="long" data-mid-active="true" data-mid-mode="all">
                    Alle Longs
                </div>
                <div class="dropdown-divider"></div>
                ${[1,2,3,4,5,6].map(p => `
                    <div class="dropdown-item ${(longActive && longMode === String(p)) ? 'selected' : ''}"
                         data-mid-type="long"
                         data-mid-active="true"
                         data-mid-mode="${p}">
                        Phase ${p}
                    </div>
                `).join("")}
            </div>
        </div>

        <!-- Exit Pille -->
        <div class="pill-dropdown-wrapper" style="position: relative; display: inline-block;">
            <span class="pill pill-exit ${exitActive ? 'active' : ''}">
                E <span class="dropdown-arrow">▼</span>
            </span>
            <div class="pill-dropdown-menu" id="exit-phase-dropdown" style="display: none;">
                <div class="dropdown-item ${!exitActive ? 'selected' : ''}" 
                     data-mid-type="exit" data-mid-active="false" data-mid-mode="null">
                    Aus
                </div>
                <div class="dropdown-item ${(exitActive && exitMode === 'all') ? 'selected' : ''}" 
                     data-mid-type="exit" data-mid-active="true" data-mid-mode="all">
                    Alle Exits
                </div>
                <div class="dropdown-divider"></div>
                ${[1,2,3,4,5,6].map(p => `
                    <div class="dropdown-item ${(exitActive && exitMode === String(p)) ? 'selected' : ''}"
                         data-mid-type="exit"
                         data-mid-active="true"
                         data-mid-mode="${p}">
                        Phase ${p}
                    </div>
                `).join("")}
            </div>
        </div>

        <!-- Days -->
        <div class="pill-dropdown-wrapper" style="position: relative; display: inline-block; margin-left: 2px;">
            <span class="pill pill-days ${daysActive ? 'active' : ''}">
                D <span class="dropdown-arrow">▼</span>
            </span>
            <div class="pill-dropdown-menu" id="days-phase-dropdown" style="display: none;">
                <div class="dropdown-item ${!currentDays ? 'selected' : ''}" 
                     data-days-type="days" data-days-value="">
                    Alle
                </div>
                <div class="dropdown-divider"></div>
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
