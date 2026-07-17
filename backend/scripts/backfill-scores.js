import { query } from '../src/config/db.js';
import { calculateOverallScore, generateAiSummary, computeDetailedStats } from '../src/modules/drivetest/scoring.service.js';

async function backfill() {
  const tests = await query(
    `SELECT dt.drive_test_id, dt.test_name, dt.distance_km, dt.operator_id, o.operator_name
     FROM drive_tests dt
     JOIN operators o ON o.operator_id = dt.operator_id
     WHERE dt.status = 'COMPLETED'`);

  console.log(`Found ${tests.length} tests to backfill`);

  for (const t of tests) {
    const samples = await query(
      `SELECT rsrp, rsrq, sinr, dl_throughput, ul_throughput
       FROM drive_test_samples WHERE drive_test_id = ?`, [t.drive_test_id]);

    if (!samples.length) {
      console.log(`  #${t.drive_test_id} — no samples, skipping`);
      continue;
    }

    const score = await calculateOverallScore(samples);
    const stats = computeDetailedStats(samples);
    const dist = Number(t.distance_km) || 0;
    const summary = await generateAiSummary(t.operator_name, score, dist.toFixed(2), samples.length, stats);

    await query(
      `UPDATE drive_tests SET overall_score = ?, ai_summary = ?, technology = '4G'
       WHERE drive_test_id = ?`,
      [score, summary, t.drive_test_id]);

    console.log(`  #${t.drive_test_id} ${t.test_name.slice(0, 40)}... → score=${score}, tech=4G`);
  }

  console.log('Done');
  process.exit(0);
}

backfill().catch(e => { console.error(e); process.exit(1); });
