export function renderActiveOrdersPills(activeOrders, state) {
    const pillContainer = document.getElementById("tools-pill-container");
    
    if (pillContainer) {
        const ordersArray = Array.isArray(activeOrders) ? activeOrders : [];
        const totalCount = ordersArray.length;
        
        const submittedCount = ordersArray.filter(o => (o.status || '').toLowerCase().includes('submit')).length;
        const executedCount = ordersArray.filter(o => {
            const s = (o.status || '').toLowerCase();
            return s.includes('exec') || s.includes('fill');
        }).length;
        const canceledCount = ordersArray.filter(o => (o.status || '').toLowerCase().includes('cancel')).length;

        const isSubmittedActive = state.filterStatus === 'submitted';
        const isExecutedActive = state.filterStatus === 'executed';
        const isCanceledActive = state.filterStatus === 'canceled';

        pillContainer.innerHTML = `
            <span class="pill pill-count">${totalCount}</span>
            <span class="pill pill-filter pill-submitted ${isSubmittedActive ? 'active' : ''}" data-filter="submitted">S: ${submittedCount}</span>
            <span class="pill pill-filter pill-executed ${isExecutedActive ? 'active' : ''}" data-filter="executed">E: ${executedCount}</span>
            <span class="pill pill-filter pill-canceled ${isCanceledActive ? 'active' : ''}" data-filter="canceled">C: ${canceledCount}</span>
        `;
    }
}