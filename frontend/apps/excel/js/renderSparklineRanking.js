export function renderSparklineRanking(canvas, ranks, rankColors) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!ranks || !ranks.length) return;

    // 🔥 RANKS INVERTIEREN (1 = oben)
    const maxRank = Math.max(...ranks);
    const invRanks = ranks.map(r => maxRank + 1 - r);

    // Dynamische Baseline auf Basis der invertierten Werte
    const minInv = Math.min(...invRanks);
    const maxInv = Math.max(...invRanks);
    const baselineInv = Math.round((minInv + maxInv) / 2);

    const zeroY = h / 2;
    const barWidth = w / invRanks.length;

    const maxDelta = Math.max(
        ...invRanks.map(r => Math.abs(r - baselineInv))
    );

    invRanks.forEach((invRank, i) => {
        const x = i * barWidth;
        const delta = invRank - baselineInv;
        const barHeight = Math.abs(delta) / maxDelta * (h / 2);

        // Farbe bleibt unverändert (nutzt originalen Rank)
        const originalRank = ranks[i];
        let color;

        if (maxRank <= 11) {
            // SECTORS
            color = rankColors[originalRank] || "#000";
        } else {
            // INDUSTRIES
            const cls = Math.ceil(originalRank / 9);
            color = rankColors[cls] || "#000";
        }

        ctx.fillStyle = color;

        if (delta >= 0) {
            ctx.fillRect(x, zeroY - barHeight, barWidth - 1, barHeight);
        } else {
            ctx.fillRect(x, zeroY, barWidth - 1, barHeight);
        }
    });

    ctx.strokeStyle = "#888";
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(w, zeroY);
    ctx.stroke();
}
