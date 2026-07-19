/**
 * One-off import of Orange Bo drive test TRP files (sample per test type).
 * Run from the backend directory: node scripts/import_orange_trp.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { importTrpFile } from '../src/modules/drivetest/drivetest.service.js';
import { pool } from '../src/config/db.js';

// Orange = operator_id 1
const OPERATOR_ID = 1;

const BASE = 'C:/Users/Saccoh1629182/Documents/Babah/BS/OCS/project/babah/PM Files/PM Files/all_aprators/Orange_Bo_CL01';

const FILES = [
  {
    file:       `${BASE}/Orange_2Gmos_Bo_CL01_18_Jan_2026/2G_MOS_OS_20260117T235716Z.trp`,
    technology: '2G',
    testName:   'Orange 2G MOS — Bo CL01 — Jan 17 2026',
    routeType:  'urban',
    testerName: 'Orange Drive Test Team',
  },
  {
    file:       `${BASE}/Orange_3G_IDLE_Bo_CL01_18_Jan_2026/Orange_Universal_Idle_3G_Universal_Idle_20260118T085824Z.trp`,
    technology: '3G',
    testName:   'Orange 3G Idle — Bo CL01 — Jan 18 2026',
    routeType:  'urban',
    testerName: 'Orange Drive Test Team',
  },
  {
    file:       `${BASE}/Orange_3G_Ping_Bo_CL01_18_Jan_2026/3G_Ping_3G_DL_20260118T085821Z.trp`,
    technology: '3G',
    testName:   'Orange 3G Ping — Bo CL01 — Jan 18 2026',
    routeType:  'urban',
    testerName: 'Orange Drive Test Team',
  },
  {
    file:       `${BASE}/Orange_3G_DL_Bo_CL01_19Jan2026/Orange_3G_DL_Corrected_GPS_3G_DL_Corrected_GPS_20260119T153538Z.trp`,
    technology: '3G',
    testName:   'Orange 3G DL — Bo CL01 — Jan 19 2026',
    routeType:  'urban',
    testerName: 'Orange Drive Test Team',
  },
  {
    file:       `${BASE}/Orange_4G_IDLE_CL01_18_Jan_2026/Orange_Universal_Idle_4G_Universal_Idle_20260118T085823Z.trp`,
    technology: '4G',
    testName:   'Orange 4G Idle — Bo CL01 — Jan 18 2026',
    routeType:  'urban',
    testerName: 'Orange Drive Test Team',
  },
  {
    file:       `${BASE}/Orange_4G_Ping_Bo_CL01_18_Jan_2026/LTE_Ping_LTE_DL_20260118T085822Z.trp`,
    technology: '4G',
    testName:   'Orange 4G Ping — Bo CL01 — Jan 18 2026',
    routeType:  'urban',
    testerName: 'Orange Drive Test Team',
  },
  {
    file:       `${BASE}/Orange_4GDL_Bo_CL01_19Jan2026/Orange_LTE_DL_Corrected_GPS_LTE_DL_Corrected_GPS_20260119T155431Z.trp`,
    technology: '4G',
    testName:   'Orange LTE DL — Bo CL01 — Jan 19 2026',
    routeType:  'urban',
    testerName: 'Orange Drive Test Team',
  },
  {
    file:       `${BASE}/Orange_4GUL_Bo_CL01_19Jan2026/Orange_LTE_UL_Corrected_GPS_Orange_3GUL_Corrected_GPS_20260119T153545Z.trp`,
    technology: '4G',
    testName:   'Orange LTE UL — Bo CL01 — Jan 19 2026',
    routeType:  'urban',
    testerName: 'Orange Drive Test Team',
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
