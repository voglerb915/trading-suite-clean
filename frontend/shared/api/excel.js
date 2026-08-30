// frontend/shared/api/excel.js

export async function getExcelRawData() {
    const res = await fetch('/api/excel/rawdata', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    return await res.json();
}
