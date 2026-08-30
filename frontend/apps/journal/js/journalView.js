// ist für das Seitenlayout zuständig
export class JournalView {
    constructor(rootElement) {
        this.root = rootElement;
    }

    renderLayout() {
        this.root.innerHTML = `
            <div class="journal-container" style="display: flex; gap: 20px; width: 100%; height: calc(100vh - 40px); padding: 20px; box-sizing: border-box; background: #121212; color: #fff;">
                <!-- Linke Spalte: Tabelle -->
                <div class="journal-pane" style="flex: 1; background: #1e1e1e; border-radius: 8px; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #3498db; border-bottom: 1px solid #333; padding-bottom: 8px;">
                        Executed Trades (Journal)
                    </div>
                    <div style="overflow-x: auto; flex: 1;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
<thead>
    <tr style="text-align: left; border-bottom: 2px solid #444; color: #aaa;">
        <th style="padding: 8px 10px;">Ex-ID</th>
        <th style="padding: 8px 10px;">Pd-ID</th>
        <th style="padding: 8px 10px;">Ticker</th>
        <th style="padding: 8px 10px;">Strategie</th>
        <th style="padding: 8px 10px;">Rolle</th>
        <th style="padding: 8px 10px;">Preis</th>
        <th style="padding: 8px 10px;">Qty</th>
        <th style="padding: 8px 10px;">Zeit</th>
        <th style="padding: 8px 10px;">Status</th>
    </tr>
</thead>
                            <tbody id="journal-tbody">
                                <!-- Wird vom Renderer gefüllt -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Rechte Spalte: Analysen -->
                <div class="journal-pane" id="journal-analytics-pane" style="flex: 1; background: #1e1e1e; border-radius: 8px; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #3498db; border-bottom: 1px solid #333; padding-bottom: 8px;">
                        Analysen & Details
                    </div>
                    <div id="analytics-content" style="font-size: 13px; flex: 1;">
                        <!-- Wird vom Analytics-Renderer gefüllt -->
                    </div>
                </div>
            </div>
        `;
    }
}