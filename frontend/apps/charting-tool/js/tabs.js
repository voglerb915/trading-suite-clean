// tabs.js – Modul für Tab-Umschaltung
const tabs = document.querySelectorAll('.charting-tab');
const panels = document.querySelectorAll('.chart-panel');

function switchTab(targetId) {
    // Tabs umschalten
    tabs.forEach(t => {
        if (t.dataset.tab === targetId) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });

    // Panels umschalten
    panels.forEach(panel => {
        if (panel.dataset.panel === targetId) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
}

// Klick-Events registrieren
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
    });
});

// Sofort beim Start den aktiven Tab erzwingen
const currentActiveTab = document.querySelector('.charting-tab.active') || tabs[0];
if (currentActiveTab) {
    switchTab(currentActiveTab.dataset.tab);
}