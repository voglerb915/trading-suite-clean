export async function getExecutedTrades() {
    const res = await fetch("/api/journal/executed");
    if (!res.ok) throw new Error("Journal API Error");
    return await res.json();
}
