export class OrderCalculator {
    static getStrategyDefaults(strategy) {
        let defaultRisk = 1.0;
        let effectiveDirection = "long";

        switch (strategy) {
            case "swing trade": 
                defaultRisk = 1.0; 
                break;
            case "investment": 
                defaultRisk = 0.5; 
                effectiveDirection = "long"; 
                break;
            case "high52": 
                defaultRisk = 1.5; 
                break;
            case "insideday52w": 
                defaultRisk = 1.0; 
                effectiveDirection = "long"; 
                break;
            case "stage3topping": 
                defaultRisk = 1.0; 
                effectiveDirection = "short"; 
                break;
            case "sparksignals": 
                defaultRisk = 1.2; 
                break;
            case "none": 
            default: 
                defaultRisk = 2.0; 
                effectiveDirection = "long"; 
                break;
        }

        return { defaultRisk, effectiveDirection };
    }

    static calculateOrderValues(basePrice, strategy, direction = "long", customRiskPercent = null, limitPercent = 1.0, candle = null) {
        const defaults = OrderCalculator.getStrategyDefaults(strategy);
        let effectiveDirection = direction || defaults.effectiveDirection;

        const riskPercent = (customRiskPercent !== null && customRiskPercent !== undefined && !isNaN(customRiskPercent)) 
            ? parseFloat(customRiskPercent) 
            : defaults.defaultRisk;

        let entry = basePrice;
        let stop;

        if (candle && strategy === "insideday52w") {
            const isBullBar = candle.close > candle.open;
            if (isBullBar) {
                entry = candle.high;
                stop = candle.low;
            } else {
                entry = candle.high;
                stop = candle.low;
            }
        } else {
            entry = basePrice;
            
            if (effectiveDirection === "short") {
                stop = basePrice * 1.05;
            } else {
                stop = basePrice * 0.95;
            }
        }

        let limit, takeProfit;
        if (effectiveDirection === "short") {
            limit = entry * (1 - (limitPercent / 100));
        } else {
            limit = entry * (1 + (limitPercent / 100));
        }

        const depotSize = window.dataStore?.depotSize || 10000; 
        let shares = 0;

        if (limit > 0 && stop > 0) {
            const riskAmountMoney = depotSize * (riskPercent / 100);
            const riskPerShare = (effectiveDirection === "short") ? (stop - limit) : (limit - stop);

            if (riskPerShare > 0) {
                const calculatedShares = Math.floor(riskAmountMoney / riskPerShare);
                shares = calculatedShares > 0 ? calculatedShares : 0;
            }
        }

        if (effectiveDirection === "short") {
            const riskPerShare = stop - limit;
            takeProfit = limit - (2 * riskPerShare);
        } else {
            const riskPerShare = limit - stop;
            takeProfit = limit + (2 * riskPerShare);
        }

        const exactRiskPerShare = (effectiveDirection === "short") ? Math.abs(stop - limit) : Math.abs(limit - stop);
        const absoluteRiskMoney = shares * exactRiskPerShare;

        return {
            riskPercent: riskPercent,
            absoluteRiskMoney: absoluteRiskMoney,
            entry: entry.toFixed(2),
            stop: stop.toFixed(2),
            limit: limit.toFixed(2),
            takeProfit: takeProfit.toFixed(2),
            shares: shares,
            effectiveDirection: effectiveDirection
        };
    }
}