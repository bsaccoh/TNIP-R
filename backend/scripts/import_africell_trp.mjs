/**
 * One-off import of Africell Bo drive test TRP files.
 * Run from the backend directory: node scripts/import_africell_trp.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importTrpFile } from '../src/modules/drivetest/drivetest.service.js';
import { pool } from '../src/config/db.js';

const __dir = path.dirname(fileURLToPath(import.meta.url));

// Africell = operator_id 2
const OPERATOR_ID = 2;

const TRP_BASE = 'C:/Users/Saccoh1629182/Documents/Babah/BS/OCS/project/babah/PM Files/PM Files/all_aprators/Africell_Bo_CL01';

const FILES = [
  {
    file:       `${TRP_BASE}/Africell_2G_Mos_Bo_CL01_18_Jan_2026/Africell_2G_MOS_20260118T153523Z.trp`,
    technology: '2G',
    testName:   'Africell 2G MOS — Bo CL01 — Jan 18 2026',
    routeType:  'urban',
    testerName: 'Africell Drive Test Team',
  },
  {
    file:       `${TRP_BASE}/Africell_3G_Mos_Bo_CL01_19_Jan_2026/Africell_3G_MOS_20260117T235641Z.trp`,
    technology: '3G',
    testName:   'Africell 3G MOS — Bo CL01 — Jan 17 2026',
    routeType:  'urban',
    testerName: 'Africell Drive Test Team',
  },
  {
    file:       `${TRP_BASE}/Africell_4G_DL_Corrected_GPS_Bo_CL01_19Jan2026/Africell_LTE_DL_Corrected_GPS_LTE_DL_Corrected_GPS_20260119T153655Z.trp`,
    technology: '4G',
    testName:   'Africell LTE DL — Bo CL01 — Jan 19 2026',
    routeType:  'urban',
    testerName: 'Africell Drive Test Team',
  },
];

for (const { file, technology, testName, routeType, testerName } of FILES) {
  const filename = path.basename(file);
  console.log(`\nImporting ${filename}...`);
  try {
    const buffer = Buffer.from(fs.readFileSync(file));
    const result = await importTrpFile(OPERATOR_ID, { testName, technology, routeType, testerName }, buffer, filename);
    console.log(`  ✓ drive_test_id=${result.driveTestId}, samples=${result.samplesImported}, dist=${result.distanceKm}km, dur=${result.durationMin}min`);
    if (result.device)   console.log(`    device: ${result.device}`);
    if (result.operator) console.log(`    detected operator: ${result.operator}`);
  } catch (err) {
    if (err.message?.includes('already been imported')) {
      console.log(`  ⚠ Skipped (duplicate): ${err.message}`);
    } else {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }
}

await pool.end();
console.log('\nDone.');
