// --- NAVIGATION & TOOL STEUERUNG ---
window.showTool = function(tool) {
    document.querySelectorAll(".tool-iframe").forEach(frame => {
        frame.style.display = "none";
    });

    const active = document.getElementById(`iframe-${tool}`);
    if (active) active.style.display = "block";

    document.querySelectorAll("#main-nav a").forEach(a => a.classList.remove("active"));
    const activeLink = document.querySelector(`#main-nav a[data-tool="${tool}"]`);
    if (activeLink) activeLink.classList.add("active");
};

document.querySelectorAll("#main-nav a").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const tool = link.getAttribute("data-tool");
        if (tool) showTool(tool);
    });
});

// --- GLOBAL MESSAGE LISTENER ---
window.addEventListener("message", (event) => {
    if (event.data?.type === "RESPONSE") {
        const cockpitFrame = document.getElementById("iframe-cockpit");
        if (cockpitFrame) cockpitFrame.contentWindow.postMessage(event.data, "*");
    }

    if (event.data?.type === "OPEN_WATCHLIST_NOTE") {
        const { id, ticker, notes } = event.data;
        openHostNoteModal(id, ticker, notes);
    }

    if (event.data?.type === "OPEN_CHART_MODAL") {
        const { ticker } = event.data;
        document.getElementById("modal-ticker-title").textContent = `Analyse: ${ticker}`;
        document.getElementById("chart-modal").style.display = "flex";
    }

    if (event.data?.type === "system-status-update") {
        updateHeaderSystemBadge(event.data.badge, event.data.text);
    }
});

// --- HOST MODAL LOGIK (Notizen) ---
let currentEditingId = null;

function openHostNoteModal(id, ticker, initialNotes) {
    currentEditingId = id;
    document.getElementById("host-modal-ticker").textContent = ticker;
    document.getElementById("host-modal-textarea").value = initialNotes || "";
    document.getElementById("host-note-modal").style.display = "flex";
}

function closeHostNoteModal() {
    document.getElementById("host-note-modal").style.display = "none";
    currentEditingId = null;
}

document.getElementById("host-modal-cancel").addEventListener("click", closeHostNoteModal);
document.getElementById("host-modal-x-close").addEventListener("click", closeHostNoteModal);

document.getElementById("host-modal-save").addEventListener("click", async () => {
    if (!currentEditingId) return;
    const newNotes = document.getElementById("host-modal-textarea").value;

    try {
        const response = await fetch(`/api/watchlist/${currentEditingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: newNotes })
        });

        if (!response.ok) throw new Error("Fehler beim Speichern der Notiz");

        closeHostNoteModal();
        const dashboardFrame = document.getElementById("iframe-dashboard");
        if (dashboardFrame) {
            dashboardFrame.contentWindow.postMessage({ type: "WATCHLIST_UPDATED" }, "*");
        }

    } catch (err) {
        console.error("Speicher-Fehler:", err);
        alert("Fehler beim Speichern der Notiz.");
    }
});

// --- CHART MODAL & SCROLL TO TOP ---
document.getElementById("close-chart-modal").addEventListener("click", () => {
    document.getElementById("chart-modal").style.display = "none";
});

const scrollTopBtn = document.getElementById("scrollTopBtn");

window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
        scrollTopBtn.style.display = "block";
    } else {
        scrollTopBtn.style.display = "none";
    }
});

scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// --- DEVICE INFO & SYSTEM BADGE ---
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("/api/device-info");
        const data = await res.json();
        const deviceInfo = document.getElementById("device-status-info");
        const mode = data.isLaptop ? "Mobile Mode" : "Stationary";
        if (deviceInfo) {
            deviceInfo.innerHTML = `${data.deviceName} | ${mode} <span id="header-system-badge"></span>`;
        }
    } catch (e) {
        console.error("Device Info konnte nicht geladen werden", e);
    }
});

function updateHeaderSystemBadge(badge, text) {
    const el = document.getElementById("header-system-badge");
    if (!el) return;
    el.className = "";
    el.classList.add(`header-badge-${badge}`);
    el.textContent = text;
}

document.addEventListener("click", (e) => {
    if (e.target.id === "header-system-badge") {
        showTool("control");
    }
});

// --- INITIALISIERUNG & GESTAFFELTES LADEN ---
// --- INITIALISIERUNG & GESTAFFELTES LADEN ---
document.addEventListener("DOMContentLoaded", () => {
    window.postMessage({ type: "REQUEST", action: "INIT" }, "*");
    showTool("focuspanel");

    // Flag zur Verhinderung von Mehrfach-Triggern
    window._twsSyncTriggered = false;

    let accumulatedDelay = 1000;
    const iframeSequence = [
        { id: 'iframe-focuspanel', delay: 1000 },
        { id: 'iframe-excel',      delay: 2000 },
        { id: 'iframe-charting',   delay: 3500 },
        { id: 'iframe-lab',        delay: 2000 },
        { id: 'iframe-dashboard',  delay: 4000 },
        { id: 'iframe-journal',    delay: 3000 }
    ];

    iframeSequence.forEach(item => {
        accumulatedDelay += item.delay;
        setTimeout(() => {
            const frame = document.getElementById(item.id);
            if (frame && !frame.src && frame.getAttribute('data-src')) {
                frame.src = frame.getAttribute('data-src');
                console.log(`🚀 Iframe sequenziell gestartet: ${item.id} (nach ${accumulatedDelay}ms)`);
            }
        }, accumulatedDelay);
    });
});

// Lausche auf das echte Event, wenn das Cockpit komplett mit dem Laden fertig ist
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'COCKPIT_BOOT_COMPLETE') {
        if (window._twsSyncTriggered) return;
        window._twsSyncTriggered = true;

        console.log("🎯 COCKPIT_BOOT_COMPLETE empfangen – starte JETZT den finalen TWS-Execution-Sync...");
        
        try {
            const res = await fetch("/api/ibkr/sync-executions", { method: "POST" });
            const json = await res.json();
            console.log("✅ TWS-Sync erfolgreich abgeschlossen:", json.message);
        } catch (err) {
            console.warn("⚠️ TWS-Sync Trigger fehlgeschlagen:", err.message);
        }
    }
});

