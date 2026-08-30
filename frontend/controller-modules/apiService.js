// modules/apiService.js

/**
 * Phase 1: Stammdaten laden
 */
export async function fetchBaseMarketData() {
    const [stocksRes, sectorsRes, industriesRes, etfsRes] = await Promise.all([
        fetch("/api/market/stocks").then(r => r.json()),
        fetch("/api/market/sectors").then(r => r.json()),
        fetch("/api/market/industries").then(r => r.json()),
        fetch("/api/market/etfs").then(r => r.json())
    ]);

    return {
        stocks: stocksRes,
        sectors: sectorsRes,
        industries: industriesRes,
        etfs: etfsRes
    };
}

/**
 * Phase 2: Signale & Sparks laden (Hier lag eventuell der Fehler beim Abrufen/Verarbeiten)
 */
// controller-modules/apiService.js
export async function fetchSignals() { // Hier von fetchSignalsAndSparks umbenannt
    const [midSignalsData, sparkSignalsDataRaw] = await Promise.all([
        fetch("/api/analysis/midsignals")
            .then(r => r.ok ? r.json() : { success: false, data: [], counts: {} })
            .catch(() => ({ success: false, data: [], counts: {} })),
        fetch("/api/sparklinesignals")
            .then(r => r.ok ? r.json() : ({ stocks: {}, sectors: {}, industries: {} }))
            .catch(() => ({ stocks: {}, sectors: {}, industries: {} }))
    ]);
    return { midSignalsData, sparkSignalsDataRaw };
}

/**
 * Phase 3: Strategie-Reader (Stage 3 & InsideDay) laden
 */
// controller-modules/apiService.js
export async function fetchStrategyReaders() { // Hier von fetchStrategyReaderData geändert
    let stage3ReaderData = [];
    try {
        const res = await fetch("/api/strategy/stage3topping");
        const json = await res.json();
        stage3ReaderData = json.signals || [];
    } catch (err) {
        console.warn("Stage3 Reader Fetch Error:", err);
    }

    let insideDayReaderData = [];
    try {
        const res = await fetch("/api/strategy/insideday52w");
        const json = await res.json();
        insideDayReaderData = json.data || json.signals || [];
    } catch (err) {
        console.warn("InsideDay Reader Fetch Error:", err);
    }

    return { stage3ReaderData, insideDayReaderData };
}