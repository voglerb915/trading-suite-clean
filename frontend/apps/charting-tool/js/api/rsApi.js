// js/rs/api/rsApi.js

export async function fetchIndustryScores() {
    try {
        const res = await fetch('/api/charts/industry-scores');
        const json = await res.json();
        return json.success ? json.data : [];
    } catch (err) {
        console.error("RS API Fehler: industry-scores", err);
        return [];
    }
}

export async function fetchIndustryPerformance() {
    try {
        const res = await fetch('/api/charts/industry-performance');
        const json = await res.json();
        return json.success ? json.data : [];
    } catch (err) {
        console.error("RS API Fehler: industry-performance", err);
        return [];
    }
}

export async function fetchSectorScores() {
    try {
        const res = await fetch('/api/charts/sector-scores');
        const json = await res.json();
        return json.success ? json.data : [];
    } catch (err) {
        console.error("RS API Fehler: sector-scores", err);
        return [];
    }
}

export async function fetchSectorPerformance() {
    try {
        const res = await fetch('/api/charts/sector-performance');
        const json = await res.json();
        return json.success ? json.data : [];
    } catch (err) {
        console.error("RS API Fehler: sector-performance", err);
        return [];
    }
}

/**
 * Lädt alle RS-Daten parallel.
 * Wird später in rsLogic.js verwendet.
 */
export async function fetchAllRsData() {
    const [
        industryScores,
        industryPerf,
        sectorScores,
        sectorPerf
    ] = await Promise.all([
        fetchIndustryScores(),
        fetchIndustryPerformance(),
        fetchSectorScores(),
        fetchSectorPerformance()
    ]);

    return {
        industryScores,
        industryPerf,
        sectorScores,
        sectorPerf
    };
}
