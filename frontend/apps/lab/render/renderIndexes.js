import { formatTimestamp } from "../../../shared/utils/time.js";

export function renderIndexes(containerId, data) {
    const html = `
        <table class="lab-table index-base-table">
            <thead>
                <tr>
                    <th>Index</th>
                    <th>%</th>
                    <th>Kurs</th>
                    <th>Land</th>
                    <th>Region</th>
                    <th>Letzter Tag</th>
                    <th>Ticker</th>
                    <th>Anzahl Tage</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(d => {
                    const today = d.history?.[0];
                    const yesterday = d.history?.[1];

                    const changePct = (today?.close && yesterday?.close)
                        ? ((today.close - yesterday.close) / yesterday.close) * 100
                        : 0;

                    return `
                        <tr>
                            <td>${d.index_name}</td>

                            <td style="color:${changePct >= 0 ? '#0a0' : '#c00'};">
                                ${changePct.toFixed(2)}%
                            </td>

                            <td>${today?.close?.toFixed(2) ?? "-"}</td>

                            <td>${d.country}</td>
                            <td>${d.region}</td>

                            <td>${today?.date ? formatTimestamp(today.date) : "-"}</td>

                            <td>${d.ticker}</td>

                            <td>${d.history.length}</td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;

    document.getElementById(containerId).innerHTML = html;
}
