export function renderSparkline(canvas, values) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Werte in Numbers umwandeln
    const nums = values.map(v => Number(v));

    const max = Math.max(...nums);
    const min = Math.min(...nums);

    const zeroY = h / 2; // 0-Linie in der Mitte
    const barWidth = w / nums.length;

    nums.forEach((v, i) => {
        const x = i * barWidth;

        // Höhe relativ zur Range
        const barHeight = Math.abs(v) / Math.max(Math.abs(max), Math.abs(min)) * (h / 2);

        // Farbe bestimmen (Performance-Logik)
        let color = "#007bff"; // blau (positiv)
        if (v < 0) color = "#ff9800"; // orange (negativ)

        if (v === max && v > 0) color = "#00cc00"; // grün (höchster Wert)
        if (v === min && v < 0) color = "#ff0000"; // rot (tiefster Wert)

        ctx.fillStyle = color;

        if (v >= 0) {
            ctx.fillRect(x, zeroY - barHeight, barWidth - 1, barHeight);
        } else {
            ctx.fillRect(x, zeroY, barWidth - 1, barHeight);
        }
    });

    // 0-Linie
    ctx.strokeStyle = "#888";
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(w, zeroY);
    ctx.stroke();
}
