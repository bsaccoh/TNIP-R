/**
 * Seed script: demo network footprint (sites + cells) for the non-Orange
 * operators, so the Dashboard "Network Footprint by Operator" chart shows a
 * realistic multi-operator layout.
 *
 * All rows are prefixed with "DEMO" in their site/cell codes so they can be
 * removed cleanly and never collide with real imported inventory.
 *
 *   Seed:   node scripts/seed-footprint-demo.js
 *   Remove: node scripts/seed-footprint-demo.js --clear
 *
 * Re-running the seed is idempotent (upsert on the unique site/cell codes).
 */
import mysql from 'mysql2/promise';

const DB = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root123',
  database: process.env.DB_NAME || 'tnipr',
  namedPlaceholders: true,
};

// technology_id mapping from the base seed (2G=1, 3G=2, 4G=3, 5G=4)
const TECH_ID = { '2G': 1, '3G': 2, '4G': 3, '5G': 4 };

// Per-operator footprint profiles. Sized to sit alongside Orange
// (~649 sites / ~24 500 cells) so the bars look balanced, not like slivers.
const PROFILES = [
  { operator: 'Africell',  sites: 560, cells: { '2G': 1400, '3G': 2100, '4G': 9500, '5G': 320 } },
  { operator: 'Qcell',     sites: 410, cells: { '2G': 900,  '3G': 1500, '4G': 7200, '5G': 150 } },
  { operator: 'SierraTel', sites: 220, cells: { '2G': 700,  '3G': 950,  '4G': 3100, '5G': 0   } },
];

// Sierra Leone bounding box (approx) for plausible coordinates.
const SL = { latMin: 6.9, latMax: 9.9, lonMin: -13.3, lonMax: -10.3 };
const rand = (min, max) => min + Math.random() * (max - min);

async function resolveOperatorId(conn, name) {
  const [rows] = await conn.query('SELECT operator_id FROM operators WHERE operator_name = ?', [name]);
  return rows.length ? rows[0].operator_id : null;
}

async function seed(conn) {
  for (const profile of PROFILES) {
    const opId = await resolveOperatorId(conn, profile.operator);
    if (!opId) { console.warn(`  ! Operator "${profile.operator}" not found — skipping`); continue; }

    // ── Sites ──
    const siteCodes = [];
    for (let i = 1; i <= profile.sites; i++) {
      siteCodes.push(`DEMO${opId}-${String(i).padStart(4, '0')}`);
    }
    for (let i = 0; i < siteCodes.length; i += 200) {
      const chunk = siteCodes.slice(i, i + 200);
      const rows = chunk.map((code, j) => [
        opId, code, `${profile.operator} Site ${i + j + 1}`,
        Number(rand(SL.latMin, SL.latMax).toFixed(6)),
        Number(rand(SL.lonMin, SL.lonMax).toFixed(6)),
        ((i + j) % 4) + 1, // region_id round-robin (regions 1..4 exist in seed)
      ]);
      await conn.query(
        `INSERT INTO sites (operator_id, site_code, site_name, latitude, longitude, region_id)
         VALUES ${rows.map(() => '(?,?,?,?,?,?)').join(',')}
         ON DUPLICATE KEY UPDATE site_name = VALUES(site_name)`,
        rows.flat()
      );
    }

    // Resolve DEMO site_ids for this operator (for cell linkage).
    const [siteRows] = await conn.query(
      'SELECT site_id FROM sites WHERE operator_id = ? AND site_code LIKE ?',
      [opId, `DEMO${opId}-%`]
    );
    const siteIds = siteRows.map((r) => r.site_id);

    // ── Cells (spread across this operator's sites, per technology) ──
    let totalCells = 0;
    for (const [tech, count] of Object.entries(profile.cells)) {
      if (!count) continue;
      const techId = TECH_ID[tech];
      const cells = [];
      for (let n = 1; n <= count; n++) {
        const siteId = siteIds[n % siteIds.length];
        cells.push([opId, siteId, techId, `DEMO${opId}-${tech}-${n}`, `${tech} Cell ${n}`]);
      }
      for (let i = 0; i < cells.length; i += 500) {
        const chunk = cells.slice(i, i + 500);
        await conn.query(
          `INSERT INTO cells (operator_id, site_id, technology_id, cell_code, cell_name)
           VALUES ${chunk.map(() => '(?,?,?,?,?)').join(',')}
           ON DUPLICATE KEY UPDATE technology_id = VALUES(technology_id)`,
          chunk.flat()
        );
      }
      totalCells += count;
    }

    console.log(`  ✓ ${profile.operator}: ${profile.sites} sites, ${totalCells.toLocaleString()} cells`);
  }
}

async function clear(conn) {
  // Deleting DEMO sites cascades to their cells (cells FK ON DELETE CASCADE).
  const [res] = await conn.query("DELETE FROM sites WHERE site_code LIKE 'DEMO%'");
  console.log(`  ✓ Removed ${res.affectedRows} demo sites (and their cells via cascade)`);
}

async function main() {
  const doClear = process.argv.includes('--clear');
  const conn = await mysql.createConnection(DB);
  console.log(`Connected to ${DB.database}`);
  if (doClear) {
    console.log('Clearing demo footprint…');
    await clear(conn);
  } else {
    console.log('Seeding demo footprint…');
    await seed(conn);
    console.log('\nDone. Refresh the National Dashboard to see the multi-operator layout.');
  }
  await conn.end();
}

main().catch((err) => { console.error('Footprint seed failed:', err); process.exit(1); });
