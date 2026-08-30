// modules/strategyProcessor.js
import { controllerState } from './state.js';

export function processSparkSignals(sparkSignalsDataRaw, stocks) {
    let sparkSignalsData = sparkSignalsDataRaw;
    
    // Falls die API ein Array liefert, in das erwartete Objektformat konvertieren
    if (Array.isArray(sparkSignalsData)) {
        sparkSignalsData = {
            stocks: Object.fromEntries(sparkSignalsData.map(s => [s.ticker, s])),
            sectors: {},
            industries: {}
        };
    }

    const validTickers = new Set(stocks.map(s => s.ticker));
    const cleanedSparkStocks = {};
    
    if (sparkSignalsData && sparkSignalsData.stocks) {
        for (const [ticker, signalData] of Object.entries(sparkSignalsData.stocks)) {
            if (validTickers.has(ticker)) {
                cleanedSparkStocks[ticker] = signalData;
            }
        }
        sparkSignalsData.stocks = cleanedSparkStocks;
    }

    return sparkSignalsData;
}

export function enrichStrategyData(stage3ReaderData, insideDayReaderData) {
    const state = controllerState;
    
    // Stage 3 Enrich
    const baseS3 = state.strategyItems.stage3topping || [];
    state.strategyItems.stage3topping = baseS3.map(stock => {
        const base = state.baseStocks.find(s => s.ticker === stock.ticker) || {};
        const r = stage3ReaderData.find(x => x.ticker === stock.ticker) || {};
        return { ...base, ...stock, ...r };
    });

    // InsideDay Enrich
    const baseID = state.strategyItems.insideday52w.length > 0 
        ? state.strategyItems.insideday52w 
        : insideDayReaderData;

    state.strategyItems.insideday52w = baseID.map(stock => {
        const base = state.baseStocks.find(s => s.ticker === stock.ticker) || {};
        const r = insideDayReaderData.find(x => x.ticker === stock.ticker) || {};
        return { ...base, ...stock, ...r, tightness: r.s2_tightness };
    });
}