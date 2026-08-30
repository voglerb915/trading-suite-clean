export class BaseTile {
    constructor(title, subTitle = '', metrics = {}, accentColor = '#3498db', leftBorderColor = '#3498db') {
        this.title = title;
        this.subTitle = subTitle;
        this.metrics = metrics;
        this.accentColor = accentColor;
        this.leftBorderColor = leftBorderColor;
    }

    render() {
        let metricsHtml = '';
        for (const [key, value] of Object.entries(this.metrics)) {
            const displayVal = typeof value === 'object' ? value.text : value;
            const displayColor = typeof value === 'object' ? (value.color || '#ddd') : '#ddd';

            metricsHtml += `
                <div style="padding: 3px 0; display: flex; justify-content: space-between;">
                    <span style="color: #aaa;">${key}:</span> 
                    <span style="color: ${displayColor}; font-weight: bold;">${displayVal}</span>
                </div>
            `;
        }

        return `
            <div style="background: #252525; padding: 15px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid ${this.leftBorderColor};">
                <div style="font-weight: bold; color: ${this.accentColor}; font-size: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 6px;">
                    <span>${this.title}</span>
                    <span style="font-size: 12px; color: #888; font-weight: normal;">${this.subTitle}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 12px;">
                    ${metricsHtml || '<div style="color: #888; grid-column: span 2;">Keine Kennzahlen verfügbar</div>'}
                </div>
            </div>
        `;
    }
}