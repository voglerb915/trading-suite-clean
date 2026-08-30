const fs = require('fs');
const path = require('path');
const { buildSectorRsSnapshot } = require('./rsPipelineSectors');

async function migrate() {
  const sourceDir = "C:/Users/Nutzer/OneDrive/Boerse/Mein-Dashboard/json-history";
  const targetDir = path.join(__dirname, '..', '..', 'json-history');

  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('_sectors.json'));

  for (const file of files) {
    console.log("Migrating:", file);

    // Alte Datei laden
    const oldData = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));

    // Neue Pipeline berechnen
    const newSnapshot = await buildSectorRsSnapshot(oldData);

    // Neue Datei speichern
    fs.writeFileSync(
      path.join(targetDir, file),
      JSON.stringify(newSnapshot, null, 2),
      'utf8'
    );
  }

  console.log("Migration abgeschlossen.");
}

migrate();
