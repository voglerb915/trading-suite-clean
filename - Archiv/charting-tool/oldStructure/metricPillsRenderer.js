export function stylePill(btn, active) {
    btn.style.cssText = `
        background: ${active ? "#f59e0b" : "#2a2a2a"};
        color: ${active ? "#000000" : "#ffffff"};
        border: 1px solid ${active ? "#f59e0b" : "#444"};

        padding: 6px 14px;
        height: 26px;
        line-height: 1.0;
        font-size: 12px;
        font-weight: 500;

        border-radius: 20px;
        cursor: pointer;
        transition: all 0.2s ease-in-out;

        display: inline-flex;
        align-items: center;
        justify-content: center;
    `;
}
