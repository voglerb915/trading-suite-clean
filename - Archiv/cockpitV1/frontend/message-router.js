// ⭐ CENTRAL MESSAGE ROUTER (läuft im HOST)
window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    console.log("ROUTER: Eingehende Nachricht:", msg.type);

    // Referenzen auf alle Frames
    const cockpitFrame   = document.getElementById("iframe-cockpit");
    const oldDashFrame   = document.getElementById("iframe-dashboard");
    const newDashFrame   = document.getElementById("iframe-new-dashboard");
    const journalFrame   = document.getElementById("iframe-journal");
    const chartingFrame  = document.getElementById("iframe-charting");
    const excelFrame     = document.getElementById("iframe-excel");
    const controlFrame   = document.getElementById("iframe-control");

    const sendTo = (frame, data) => {
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage(data, "*");
        }
    };

    // -----------------------------------------
    // 1. Cockpit sendet gefilterte Stocks
    // -----------------------------------------
    if (msg.type === "UPDATE_STOCKS") {
        console.log("ROUTER: Weiterleiten an NEW-DASHBOARD");

        sendTo(newDashFrame, {
            type: "UPDATE_STOCKS",
            stocks: msg.stocks
        });

        return;
    }

    // -----------------------------------------
    // 2. Cockpit sendet kompletten State
    // -----------------------------------------
if (msg.type === "COCKPIT_DATA") {
    console.log("ROUTER: Weiterleiten an COCKPIT");
    sendTo(cockpitFrame, msg);
    return;
}
// -----------------------------------------
// INIT: Cockpit initialisiert Dashboard
// -----------------------------------------
if (msg.type === "INIT_DASHBOARD") {
    console.log("ROUTER: Initialisiere NEW-DASHBOARD");

    sendTo(newDashFrame, {
        type: "INIT_DASHBOARD",
        stocks: msg.stocks,
        sectors: msg.sectors,
        industries: msg.industries,
        etfs: msg.etfs,
        midSignals: msg.midSignals,
        sparkSignals: msg.sparkSignals
    });

    return;
}


    // -----------------------------------------
    // 3. Journal-Events
    // -----------------------------------------
    if (msg.type === "JOURNAL_UPDATE") {
        console.log("ROUTER: Weiterleiten an JOURNAL");

        sendTo(journalFrame, msg);
        return;
    }

    // -----------------------------------------
    // 4. Dashboard sendet etwas zurück an Cockpit
    // -----------------------------------------
    if (msg.type === "DASHBOARD_EVENT") {
        console.log("ROUTER: DASHBOARD_EVENT ignoriert (Cockpit verarbeitet diesen Typ nicht)");
        return;
    }


    // -----------------------------------------
    // 5. Charting
    // -----------------------------------------
    if (msg.type === "CHARTING_EVENT") {
        console.log("ROUTER: Weiterleiten an CHARTING");

        sendTo(chartingFrame, msg);
        return;
    }

    // -----------------------------------------
    // 6. Excel
    // -----------------------------------------
    if (msg.type === "EXCEL_EVENT") {
        console.log("ROUTER: Weiterleiten an EXCEL");

        sendTo(excelFrame, msg);
        return;
    }

    // -----------------------------------------
    // 7. Control Center
    // -----------------------------------------
    if (msg.type === "CONTROL_EVENT") {
        console.log("ROUTER: Weiterleiten an CONTROL");

        sendTo(controlFrame, msg);
        return;
    }
});
