export class TextModal {
    constructor() {
        this.modalElement = null;
        this.currentData = null;
        this.onSaveCallback = null;
    }

    render() {
        this.modalElement = document.getElementById("text-editor-modal");
        if (this.modalElement) return;

        const modalHTML = `
            <div id="text-editor-modal" class="custom-modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; justify-content: center; align-items: center;">
                <div class="custom-modal-content text-editor-content" style="background: #1e1e1e; color: #fff; padding: 25px; border-radius: 8px; width: 450px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 id="text-modal-title" style="margin: 0; font-size: 18px;">Notiz bearbeiten</h3>
                        <button type="button" class="close-text-modal-btn" style="background: none; border: none; color: #fff; font-size: 22px; cursor: pointer;">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group" style="margin-bottom: 15px;">
                            <textarea id="text-modal-textarea" rows="5" class="form-control" style="width: 100%; padding: 10px; background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 4px; resize: vertical; box-sizing: border-box;"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary text-cancel-btn" style="padding: 8px 15px; background: #444; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Abbrechen</button>
                        <button type="button" class="btn btn-primary text-save-btn" style="padding: 8px 15px; background: #3498db; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Speichern</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML("beforeend", modalHTML);
        this.modalElement = document.getElementById("text-editor-modal");

        // Event-Listener für Schließen / Speichern direkt binden
        this.modalElement.querySelector(".close-text-modal-btn").addEventListener("click", () => this.hide());
        this.modalElement.querySelector(".text-cancel-btn").addEventListener("click", () => this.hide());
        
        this.modalElement.querySelector(".text-save-btn").addEventListener("click", () => {
            const textarea = document.getElementById("text-modal-textarea");
            if (this.onSaveCallback && textarea) {
                this.onSaveCallback(textarea.value);
            }
            this.hide();
        });

        // Schließen bei Klick außerhalb des Content-Bereichs
        this.modalElement.addEventListener("click", (e) => {
            if (e.target === this.modalElement) {
                this.hide();
            }
        });
    }

    show(item, callback) {
        this.currentData = item;
        this.onSaveCallback = callback;

        if (!this.modalElement) {
            this.render();
        }

        const textarea = document.getElementById("text-modal-textarea");
        const titleEl = document.getElementById("text-modal-title");

        if (titleEl) {
            titleEl.textContent = `Notiz für ${item.ticker || 'Item'}`;
        }
        if (textarea) {
            textarea.value = item.user_notes || "";
        }

        this.modalElement.style.display = "flex";
        if (textarea) textarea.focus();
    }

    hide() {
        if (this.modalElement) {
            this.modalElement.style.display = "none";
        }
    }
}