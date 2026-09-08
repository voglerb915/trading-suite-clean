// js/rs/api/rsApi.js

let rsCache = {
    industryScores: null,
    industryPerf: null,
    sectorScores: null,
    sectorPerf: null
};

export async function fetchIndustryScores() {
    if (!rsCache.industryScores) {
        try {
            const res = await fetch('/api/charts/industry-scores');
            const json = await res.json();
            rsCache.industryScores = json.success ? json.data : [];
        } catch (err) {
            console.error("RS API Fehler: industry-scores", err);
            return [];
        }
    }
    return rsCache.industryScores;
}

export async function fetchIndustryPerformance() {
    if (!rsCache.industryPerf) {
        try {
            const res = await fetch('/api/charts/industry-performance');
            const json = await res.json();
            rsCache.industryPerf = json.success ? json.data : [];
        } catch (err) {
            console.error("RS API Fehler: industry-performance", err);
            return [];
        }
    }
    return rsCache.industryPerf;
}

export async function fetchSectorScores() {
    if (!rsCache.sectorScores) {
        try {
            const res = await fetch('/api/charts/sector-scores');
            const json = await res.json();
            rsCache.sectorScores = json.success ? json.data : [];
        } catch (err) {
            console.error("RS API Fehler: sector-scores", err);
            return [];
        }
    }
    return rsCache.sectorScores;
}

export async function fetchSectorPerformance() {
    if (!rsCache.sectorPerf) {
        try {
            const res = await fetch('/api/charts/sector-performance');
            const json = await res.json();
            rsCache.sectorPerf = json.success ? json.data : [];
        } catch (err) {
            console.error("RS API Fehler: sector-performance", err);
            return [];
        }
    }
    return rsCache.sectorPerf;
}

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

export function clearRsCache() {
    rsCache = {
        industryScores: null,
        industryPerf: null,
        sectorScores: null,
        sectorPerf: null
    };
}