export class OrderView {
    constructor() {
        this.modalElement = null;
    }

    render() {
        // Immer erst prüfen, ob das Element schon im DOM existiert
        this.modalElement = document.getElementById("order-editor-modal");

        if (this.modalElement) return; // Schon da, nichts neu injizieren

        const modalHTML = `
            <div id="order-editor-modal" class="custom-modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; justify-content: center; align-items: center;">
                <div class="custom-modal-content order-editor-content" style="background: #1e1e1e; color: #fff; padding: 25px; border-radius: 8px; width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; font-size: 18px;">Order-Entwurf erstellen</h3>
                        <button type="button" class="close-modal-btn" style="background: none; border: none; color: #fff; font-size: 22px; cursor: pointer;">&times;</button>
                    </div>
                    <div class="modal-body">
                     <div class="order-info-banner" style="margin-bottom: 15px; font-weight: bold; color: #3498db; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span id="modal-ticker-label"></span> | <span id="modal-id-label"></span>
                        </div>
                    <div id="modal-risk-money-label" style="background: #2a2a2a; padding: 2px 8px; border-radius: 4px; font-size: 13px; color: #fff;">
                        Risk: 0.00 €
                    </div>
                    </div>
                        
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 13px;">Strategie</label>
                        <select id="order-strategy-select" class="form-control" style="width: 100%; padding: 8px; background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 4px;">
                            <option value="none">None (2.0%)</option>
                            <option value="swing trade">Swing Trade</option>
                            <option value="investment">Investment</option>
                            <option value="high52">High 52</option>
                            <option value="insideday52w">Inside Day 52W</option>
                            <option value="stage3topping">Stage 3 Topping</option>
                            <option value="sparksignals">Spark Signals</option>
                        </select>
                        </div>

                        <!-- Neu: Richtungs-Dropdown für manuelle Long/Short-Umschaltung -->
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 13px;">Richtung</label>
                            <select id="order-direction-select" class="form-control" style="width: 100%; padding: 8px; background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 4px;">
                                <option value="long">Long</option>
                                <option value="short">Short</option>
                            </select>
                        </div>

                        <div class="form-group" style="margin-bottom: 12px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 13px;">Risiko (% Depot)</label>
                        <select id="order-risk-select" class="form-control" style="width: 100%; padding: 8px; background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 4px;">
                            <option value="0.5">0.5%</option>
                            <option value="1.0" selected>1.0%</option>
                            <option value="1.2">1.2%</option>
                            <option value="1.5">1.5%</option>
                            <option value="2.0">2.0%</option>
                        </select>
                        </div>

                        <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;">

                        <!-- Gold Standard Layout: Vertikal von oben nach unten -->
                        <div class="order-fields-stack">
                            <div class="form-group" style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 12px;">Take Profit</label>
                                <input type="number" step="0.01" id="order-tp-input" class="form-control" style="width: 100%; padding: 6px; background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 12px;">Limit</label>
                                <input type="number" step="0.01" id="order-limit-input" class="form-control" style="width: 100%; padding: 6px; background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 12px;">Entry</label>
                                <input type="number" step="0.01" id="order-entry-input" class="form-control" style="width: 100%; padding: 6px; background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 12px;">Stop</label>
                                <input type="number" step="0.01" id="order-stop-input" class="form-control" style="width: 100%; padding: 6px; background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 12px;">Shares (Berechnet)</label>
                                <input type="number" id="order-shares-input" class="form-control" readonly style="width: 100%; padding: 6px; background: #111; color: #3498db; border: 1px solid #444; border-radius: 4px; font-weight: bold;">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary cancel-btn" style="padding: 8px 15px; background: #444; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Abbrechen</button>
                        <button type="button" class="btn btn-primary save-order-btn" style="padding: 8px 15px; background: #3498db; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Order speichern</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML("beforeend", modalHTML);
        this.modalElement = document.getElementById("order-editor-modal");
    }

    show() {
        if (!this.modalElement) {
            this.render();
        }
        if (this.modalElement) {
            this.modalElement.style.display = "flex";
        }
    }

    hide() {
        if (this.modalElement) this.modalElement.style.display = "none";
    }
}