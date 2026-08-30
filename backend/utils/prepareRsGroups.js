const fs = require('fs');
const path = require('path');

function loadIndustries() {
    const file = "C:\\Users\\Nutzer\\OneDrive\\Boerse\\mein-dashboard\\db\\finviz_industries.json";
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function prepareRsGroups() {
    const industries = loadIndustries();

    industries.forEach((ind, i) => {
        ind.rankWonDb = i + 1; // Dummy-Ranking
    });

    return { industries };
}

module.exports = { prepareRsGroups };
