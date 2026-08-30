export function HeaderTile(state) {
    const extract = state.volumeExtract || [];

    return `
        <div class="tile header-tile">
            <h2 class="tile-title">Extract</h2>

            <div class="volume-extract-mini">
                ${extract.slice(0, 12).map(item => {
                    
                    const retr = item.high
                        ? (((item.close / item.high) - 1) * 100).toFixed(1)
                        : null;

                    const retrColor =
                        retr === null ? "#888" :
                        retr <= -50 ? "#ff4444" :
                        retr <= -25 ? "orange" :
                        retr <= -10 ? "yellow" : "#fff";

                    const c2c = item.prevClose
                        ? (((item.close - item.prevClose) / item.prevClose) * 100).toFixed(1)
                        : null;

                    const c2cColor =
                        c2c === null ? "#888" :
                        c2c >= 0 ? "#00ff00" : "#ff4444";

                    return `
                        <div class="extract-mini-row">
                            <div class="ticker">${item.ticker}</div>
                            <div class="price">${item.close.toFixed(2)}</div>
                            <div class="ratio">${item.ratio?.toFixed(1) ?? "-"}</div>
                            <div class="turnover">${Math.round(item.turnover / 1_000_000)}M</div>
                            <div class="retr" style="color:${retrColor};">${retr ?? "-"}</div>
                            <div class="c2c" style="color:${c2cColor};">${c2c ?? "-"}</div>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}
