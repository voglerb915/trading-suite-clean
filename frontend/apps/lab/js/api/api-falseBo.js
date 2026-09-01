// /apps/lab/js/api/api-falseBo.js

/**
 * Ruft die 52W High + Gap Down Setup Daten (False Breakout / falseBo) von der API ab.
 */
export async function fetchFalseBoData() {
    try {
        // Angepasster Endpunkt passend zur server.js und falseBreakOut52week.js
        const response = await fetch('/api/strategy/false-bo'); 
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("FEHLER IN fetchFalseBoData:", error);
        return [];
    }
}