export class StrategySelector {
    constructor(options = ["none", "swing trade", "investment", "high52", "insideday52w", "stage3topping", "sparksignals"]) {
        this.options = options;
        this.activeMenu = null;
    }
    // ... restlicher Code bleibt unverändert

    show(event, currentStrategy, onSelectCallback) {
        this.close();

        const clientX = event ? event.clientX : window.innerWidth / 2;
        const clientY = event ? event.clientY : window.innerHeight / 2;

        console.log("📌 StrategySelector wird geöffnet bei:", clientX, clientY); // Debug-Log

        const menu = document.createElement('div');
        menu.className = 'strategy-popover-menu';
        // WICHTIG: Expliziter z-index und Hintergrund, damit es nicht überlagert wird
        menu.style = `
            position: fixed !important; 
            z-index: 2147483647 !important; 
            background: white !important; 
            border: 1px solid #ccc !important; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
            padding: 5px !important; 
            border-radius: 4px !important;
            left: ${clientX}px !important; 
            top: ${clientY}px !important;
            display: block !important;
        `;

        this.options.forEach(opt => {
            const btn = document.createElement('div');
            btn.innerText = opt;
            btn.style = `
                padding: 8px 15px; cursor: pointer; font-size: 0.85rem;
                background: ${currentStrategy === opt ? '#e8f0fe' : 'white'};
                border-bottom: 1px solid #eee; color: #333;
            `;
            btn.onmouseenter = () => btn.style.backgroundColor = '#f2f2f2';
            btn.onmouseleave = () => btn.style.backgroundColor = (currentStrategy === opt ? '#e8f0fe' : 'white');
            
            btn.onclick = (e) => {
                e.stopPropagation();
                this.close();
                if (opt !== currentStrategy) {
                    onSelectCallback(opt);
                }
            };
            menu.appendChild(btn);
        });

        setTimeout(() => {
            const closeListener = (e) => {
                if (!menu.contains(e.target)) {
                    this.close();
                    window.removeEventListener('click', closeListener);
                }
            };
            window.addEventListener('click', closeListener);
        }, 10);

        document.body.appendChild(menu);
        this.activeMenu = menu;
    }

    close() {
        if (this.activeMenu && document.body.contains(this.activeMenu)) {
            document.body.removeChild(this.activeMenu);
            this.activeMenu = null;
        }
    }
}