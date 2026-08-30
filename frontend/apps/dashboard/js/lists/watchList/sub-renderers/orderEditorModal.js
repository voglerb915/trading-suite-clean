import { OrderView } from "./order-modal-parts/orderView.js";
import { OrderCalculator } from "./order-modal-parts/orderCalculator.js";
import { OrderService } from "./order-modal-parts/orderService.js";

export class OrderEditorModal {
    constructor() {
        if (OrderEditorModal.instance) {
            return OrderEditorModal.instance;
        }
        OrderEditorModal.instance = this;

        this.view = new OrderView();
        this.currentData = null;
        this.onSaveCallback = null;
        this.isSubmitting = false;
        this.init();
    }

    init() {
        this.view.render();
        this.bindEvents();
    }

    bindEvents() {
        const modalEl = this.view.modalElement;
        if (!modalEl) return;

        const closeModal = () => this.view.hide();

        modalEl.querySelector(".close-modal-btn").addEventListener("click", closeModal);
        modalEl.querySelector(".cancel-btn").addEventListener("click", closeModal);
        modalEl.addEventListener("click", (e) => {
            if (e.target === modalEl) closeModal();
        });

        // 1. Normale Eingaben und Risiko-Dropdown
        const standardInputs = ["order-entry-input", "order-stop-input", "order-risk-select"];
        standardInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("input", () => this.triggerCalculation(false));
                el.addEventListener("change", () => this.triggerCalculation(false));
            }
        });

        // 2. Strategie-Dropdown (lädt Standardwerte/Richtung neu)
        const strategySelect = document.getElementById("order-strategy-select");
        if (strategySelect) {
            strategySelect.addEventListener("change", () => this.triggerCalculation(true));
        }

        // 2b. Richtungs-Dropdown (Manuelle Änderung)
        const directionSelect = document.getElementById("order-direction-select");
        if (directionSelect) {
            directionSelect.addEventListener("change", () => this.triggerCalculation(false));
        }

        // 3. Speichern-Button
        modalEl.querySelector(".save-order-btn").addEventListener("click", async () => {
            if (this.isSubmitting) {
                console.warn("⚠️ Doppelklick abgefangen – Speichern läuft bereits.");
                return;
            }

            this.isSubmitting = true;
            const orderData = this.getValues();
            
            try {
                await OrderService.saveOrder(orderData);
                console.log("💾 Order erfolgreich über Service gespeichert:", orderData);

                if (this.onSaveCallback) {
                    this.onSaveCallback(orderData);
                }
                closeModal();
            } catch (err) {
                console.error("Speichern fehlgeschlagen", err);
            } finally {
                setTimeout(() => {
                    this.isSubmitting = false;
                }, 400);
            }
        });
    }

    async show(item, callback) {
        this.currentData = item;
        this.onSaveCallback = callback;

        document.getElementById("modal-ticker-label").textContent = item.ticker;
        document.getElementById("modal-id-label").textContent = `ID: ${item.id} (${item.direction || 'long'})`;
        
        const rawStrategy = item.strategy_name || item.strategy || "none";
        const strategy = rawStrategy.toLowerCase().trim();
        const strategySelect = document.getElementById("order-strategy-select");
        if (strategySelect) {
            strategySelect.value = strategy;
        }

        const directionSelect = document.getElementById("order-direction-select");
        const direction = item.direction || OrderCalculator.getStrategyDefaults(strategy).effectiveDirection;
        if (directionSelect) {
            directionSelect.value = direction;
        }

        let defaultRiskNum = 1.0;
        if (item.risk_percent !== undefined && item.risk_percent !== null && !isNaN(item.risk_percent)) {
            defaultRiskNum = parseFloat(item.risk_percent);
        } else {
            defaultRiskNum = OrderCalculator.getStrategyDefaults(strategy).defaultRisk;
        }

        const riskSelect = document.getElementById("order-risk-select");
        if (riskSelect) {
            riskSelect.value = defaultRiskNum.toFixed(1);
        }

        const basePrice = item.current_price || 100;

        this.updateCalculations(basePrice, strategy, direction, defaultRiskNum, null);
        this.view.show();

        try {
            const historyData = await OrderService.fetchLatestDailyHistory(item.ticker);
            
            if (historyData) {
                this.currentCandle = historyData; 
                
                let referencePrice = basePrice;
                if (direction === "short" || strategy === "stage3topping") {
                    referencePrice = historyData.low !== undefined ? historyData.low : basePrice;
                } else {
                    referencePrice = historyData.high !== undefined ? historyData.high : basePrice;
                }
                
                const currentRisk = parseFloat(riskSelect.value) || defaultRiskNum;
                const currentStrategy = document.getElementById("order-strategy-select").value;
                const currentDirection = directionSelect ? directionSelect.value : direction;
                
                this.updateCalculations(referencePrice, currentStrategy, currentDirection, currentRisk, historyData);
            }
        } catch (err) {
            console.error("Fehler beim Laden der Historie im Modal:", err);
        }
    }

    updateCalculations(price, strategy, direction, riskPercent, candle = null) {
        const results = OrderCalculator.calculateOrderValues(price, strategy, direction, riskPercent, 1.0, candle || this.currentCandle);

        document.getElementById("order-entry-input").value = results.entry;
        document.getElementById("order-stop-input").value = results.stop;
        document.getElementById("order-limit-input").value = results.limit;
        document.getElementById("order-tp-input").value = results.takeProfit;
        document.getElementById("order-shares-input").value = results.shares;

        const riskMoneyLabel = document.getElementById("modal-risk-money-label");
        if (riskMoneyLabel && results.absoluteRiskMoney !== undefined) {
            riskMoneyLabel.textContent = `Risk: ${results.absoluteRiskMoney.toFixed(2)} €`;
        }
    }

    triggerCalculation(isStrategyChange = false) {
        const basePrice = parseFloat(document.getElementById("order-entry-input").value) || 100;
        const strategy = document.getElementById("order-strategy-select").value;
        const riskSelect = document.getElementById("order-risk-select");
        const directionSelect = document.getElementById("order-direction-select");
        
        let riskPercent = parseFloat(riskSelect.value) || 1.0;
        let direction = directionSelect ? directionSelect.value : (this.currentData?.direction || "long");

        if (isStrategyChange) {
            const defaults = OrderCalculator.getStrategyDefaults(strategy);
            riskPercent = defaults.defaultRisk;
            direction = defaults.effectiveDirection;
            
            if (riskSelect) {
                riskSelect.value = riskPercent.toFixed(1);
            }
            if (directionSelect) {
                directionSelect.value = direction;
            }
        }

        this.updateCalculations(basePrice, strategy, direction, riskPercent, this.currentCandle);
    }

    getValues() {
        return {
            id: this.currentData?.id || null,
            ticker: this.currentData?.ticker || document.getElementById("modal-ticker-label")?.textContent || '',
            direction: document.getElementById("order-direction-select")?.value || 'long',
            trade_type: this.currentData?.trade_type || 'SWING', 
            order_type: this.currentData?.order_type || 'LIMIT',
            strategy: document.getElementById("order-strategy-select").value,
            risk_percent: parseFloat(document.getElementById("order-risk-select").value) || 1.0,
            tp_price: parseFloat(document.getElementById("order-tp-input").value) || null,
            limit_price: parseFloat(document.getElementById("order-limit-input").value) || null,
            entry_price: parseFloat(document.getElementById("order-entry-input").value) || 0,
            initial_sl: parseFloat(document.getElementById("order-stop-input").value) || 0,
            quantity: parseInt(document.getElementById("order-shares-input").value, 10) || 0
        };
    }
}