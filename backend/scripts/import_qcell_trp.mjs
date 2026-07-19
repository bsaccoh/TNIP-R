/**
 * One-off import of Qcell Bo drive test TRP files.
 * Run from the backend directory: node scripts/import_qcell_trp.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { importTrpFile } from '../src/modules/drivetest/drivetest.service.js';
import { pool } from '../src/config/db.js';

// Qcell = operator_id 3
const OPERATOR_ID = 3;

const TRP_BASE = 'C:/Users/Saccoh1629182/Documents/Babah/BS/OCS/project/babah/PM Files/PM Files/all_aprators/Qcell_Bo_CL01';

const FILES = [
  {
    file:       `${TRP_BASE}/Qcell_2G_Mos_Bo_CL01_18_Jan_2026/Qcell_2G_Mos_Qcell_2Gmos_20260117T235650Z.trp`,
    technology: '2G',
    testName:   'Qcell 2G MOS — Bo CL01 — Jan 17 2026',
    routeType:  'urban',
    testerName: 'Qcell Drive Test Team',
  },
  {
    file:       `${TRP_BASE}/Qcell_3G_Idle_Bo_CL01_18_Jan_2026/Qcell_Universal_Idle_3G_Universal_Idle_20260118T085817Z.trp`,
    technology: '3G',
    testName:   'Qcell 3G Idle — Bo CL01 — Jan 18 2026',
    routeType:  'urban',
    testerName: 'Qcell Drive Test Team',
  },
  {
    file:       `${TRP_BASE}/Qcell_4G_DL_Bo_CL01_19Jan2026/Qcell_LTE_DL_Corrected_GPS_20260119T153537Z.trp`,
    technology: '4G',
    testName:   'Qcell LTE DL — Bo CL01 — Jan 19 2026',
    routeType:  'urban',
    testerName: 'Qcell Drive Test Team',
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
      if (process.env.DEBUG) console.error(err.stack);
    }
  }
}

await pool.end();
console.log('\nDone.');
