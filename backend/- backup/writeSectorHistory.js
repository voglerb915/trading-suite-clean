const fs = require('fs')
const path = require('path')
const { buildSectorRsSnapshot } = require('./rsPipelineSectors')

async function writeSectorHistory() {
  const sectors = await buildSectorRsSnapshot()

  const today = new Date().toISOString().split('T')[0]
  const file = path.join(__dirname, '..', '..', 'json-history', `${today}_sectors.json`);

  fs.writeFileSync(file, JSON.stringify(sectors, null, 2), 'utf8')

  return sectors
}

module.exports = { writeSectorHistory }
