export class OrderService {
    static async fetchLatestDailyHistory(ticker) {
        try {
            const cleanTicker = ticker ? ticker.replace('@', '').trim() : '';
            
            const response = await fetch('http://localhost:4000/api/data/daily-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickers: [cleanTicker] })
            });
            
            if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
            
            const data = await response.json();
            const record = Array.isArray(data) ? data[0] : data;

            if (record) {
                // Hilfsfunktion zum sicheren Parsen (egal ob String mit Komma oder schon Number)
                const parseVal = (val) => {
                    if (val === null || val === undefined) return 0;
                    if (typeof val === 'number') return val;
                    if (typeof val === 'string') {
                        return parseFloat(val.replace(',', '.')) || 0;
                    }
                    return 0;
                };

                return {
                    ...record,
                    open: parseVal(record.open),
                    high: parseVal(record.high),
                    low: parseVal(record.low),
                    close: parseVal(record.close)
                };
            }
            return null;
        } catch (err) {
            console.error("OrderService DailyHistory Error:", err);
            return null;
        }
    }

    static async saveOrder(orderData) {
            try {
                const response = await fetch('http://localhost:4000/api/orders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Fehler beim Speichern des Order-Entwurfs");
                }
                return await response.json();
            } catch (err) {
                console.error("OrderService Save Error:", err);
                throw err;
            }
        }
}