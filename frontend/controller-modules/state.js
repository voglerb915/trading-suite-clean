// modules/state.js
export const controllerState = {
    baseStocks: [],
    stocks: [],
    sectors: [],
    industries: [],
    etfs: [],
    midSignals: { success: false, data: [], counts: {} },
    sparkSignals: { stocks: {}, sectors: {}, industries: {} },
    strategyItems: {
        stage3topping: [],
        insideday52w: []
    },
    volumeExtract: []
};

export function getControllerState() {
    return controllerState;
}

// NEU: Ein zentraler Setter für den gesamten geladenen Boot-State
export function setBootData(data) {
    if (data.baseStocks) controllerState.baseStocks = data.baseStocks;
    if (data.stocks) controllerState.stocks = data.stocks;
    if (data.sectors) controllerState.sectors = data.sectors;
    if (data.industries) controllerState.industries = data.industries;
    if (data.etfs) controllerState.etfs = data.etfs;
    if (data.midSignals) controllerState.midSignals = data.midSignals;
    if (data.sparkSignals) controllerState.sparkSignals = data.sparkSignals;
    if (data.strategyItems) controllerState.strategyItems = data.strategyItems;
    if (data.volumeExtract) controllerState.volumeExtract = data.volumeExtract;
}