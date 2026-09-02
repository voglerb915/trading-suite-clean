/*export async function fetchSectorMomentumData() {
    try {
        const response = await fetch('http://localhost:4000/api/market/sectors/momentum');
        if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
        
        const result = await response.json(); 
        const sectorsData = Array.isArray(result) ? result : (result.sectors || result.data || []);

        if (!Array.isArray(sectorsData) || sectorsData.length === 0) {
            console.warn("Keine Sektor-Daten für den Quadranten gefunden.");
            return [];
        }
        return sectorsData;
    } catch (err) {
        console.error("API-Fehler beim Laden der Sektor-Momentum-Daten:", err);
        return [];
    }
} */

// apps/charting-tool/js/api/chartingApi.js
export async function fetchSectorMomentum() {
    const response = await fetch("http://localhost:4000/api/market/sectors/momentum");
    if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
    return await response.json();
}

export async function fetchIndustryMomentum(days = 5) {
    const response = await fetch(`http://localhost:4000/api/market/industries/momentum?days=${days}`);
    if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
    return await response.json();
}

export async function fetchStockMomentum(index, days = 5) {
    const response = await fetch(`http://localhost:4000/api/market/stocks/momentum?index=${index}&days=${days}`);
    if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
    return await response.json();
}
