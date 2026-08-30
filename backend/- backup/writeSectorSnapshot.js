const fs = require('fs')
const path = require('path')
const { buildSectorRsSnapshot } = require('./rsPipelineSectors')

async function writeSectorSnapshot() {
  const sectors = await buildSectorRsSnapshot()

  const file = path.join(__dirname, '..', '..', 'json', 'rs_sectors.json');
  fs.writeFileSync(file, JSON.stringify(sectors, null, 2), 'utf8')

  return sectors
}

module.exports = { writeSectorSnapshot }
