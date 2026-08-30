export function exportOverviewHTML(tabId) {
    const tabEl = document.getElementById(tabId);
    if (!tabEl) return;

    const gridWrapper = tabEl.querySelector(".matrix-dashboard-wrapper");
    if (!gridWrapper) return;

    const htmlContent = gridWrapper.outerHTML;

    // ---------------------------------------------------------
    // CSS inline einbetten (Weg A)
    // ---------------------------------------------------------
    const cssMatrix = getMatrixCSS();
    const cssTables = getTablesCSS();
    const cssTiles = getTilesCSS();
    const cssTabs = getTabsCSS();

    const fullHTML = `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${tabId}</title>
<style>
${cssMatrix}
${cssTables}
${cssTiles}
${cssTabs}

body {
    background: #121212;
    margin: 0;
    padding: 20px;
}
</style>
</head>
<body>
${htmlContent}
</body>
</html>
`;

    const blob = new Blob([fullHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${tabId}.html`;
    a.click();

    URL.revokeObjectURL(url);
}


// ---------------------------------------------------------
// CSS inline einbetten (Weg A)
// ---------------------------------------------------------
function getMatrixCSS() {
    return `
        .matrix-dashboard-wrapper {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 15px;
            width: 100%;
            box-sizing: border-box;
        }

        .sector-tile,
        .industries-tile {
            background: #ffffff;
            border: 1px solid #c8ced3;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;
            width: 100%;
            font-family: "Segoe UI", Arial, sans-serif;
        }
    `;
}

function getTablesCSS() {
    return `
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 6px 8px;
            border-bottom: 1px solid #ddd;
        }
    `;
}

function getTilesCSS() {
    return `
        .tile-header {
            font-weight: bold;
            padding: 8px;
            background: #f5f5f5;
            border-bottom: 1px solid #ddd;
        }
        .tile-body {
            padding: 10px;
        }
    `;
}

function getTabsCSS() {
    return `
        .tab-content {
            padding: 10px;
        }
    `;
}
