// frontend/shared/logic/loadExcelRawData.js

export async function loadExcelRawData() {
    const res = await fetch("http://localhost:4000/api/data/excel/rawdata");
    if (!res.ok) throw new Error("Excel API Error");
    return await res.json();
}
