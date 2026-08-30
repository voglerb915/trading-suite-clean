const fs = require('fs');
const path = require('path');

function loadSectors() {
    const file = path.join(__dirname, '../db/finviz_sectors.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadIndustries() {
    const file = path.join(__dirname, '../db/finviz_industries.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function prepareRsGroups() {
    const sectors = loadSectors();
    const industries = loadIndustries();

    // Dummy-Ranking (Cockpit braucht nur rank + score)
    sectors.forEach((s, i) => {
        s.rank = i + 1;
        s.score = s.rs?.wonDb?.score ?? 0;
    });

    industries.forEach((ind, i) => {
        ind.rank = i + 1;
        ind.score = ind.rs?.wonDb?.score ?? 0;
    });

    return { sectors, industries };
}

module.exports = { prepareRsGroups };
