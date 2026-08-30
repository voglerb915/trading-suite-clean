// frontend/shared/api/volume.js

export async function getVolumeMetrics() {
    const res = await fetch("http://localhost:4000/api/data/volume-metrics");
    if (!res.ok) throw new Error("Volume API Error");
    return await res.json();
}
