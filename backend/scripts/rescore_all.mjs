import { query } from '../src/config/db.js';
import { calculateOverallScore, generateAiSummary, computeDetailedStats } from '../src/modules/drivetest/scoring.service.js';

const tests = await query(
  `SELECT dt.drive_test_id, dt.technology, dt.total_samples, dt.distance_km, o.operator_name
   FROM drive_tests dt
   JOIN operators o ON o.operator_id = dt.operator_id
   ORDER BY dt.drive_test_id`
);

console.log(`Re-scoring ${tests.length} drive tests...`);

let updated = 0;
let errors  = 0;

for (const test of tests) {
  try {
    const samples = await query(
      `SELECT rsrp, rsrq, sinr, dl_throughput, ul_throughput, rtt_ms, jitter_ms, packet_loss_pct, mos, event_type, call_status
       FROM drive_test_samples WHERE drive_test_id = :id`,
      { id: test.drive_test_id }
    );

    if (!samples.length) {
      console.log(`  [${test.drive_test_id}] No samples — skipping`);
      continue;
    }

    const tech = test.technology || '4G';
    const score = await calculateOverallScore(samples, null, tech);
    const stats = await computeDetailedStats(samples);
    const distKm = test.distance_km != null ? Number(test.distance_km).toFixed(2) : '0.00';
    const aiSummary = await generateAiSummary(
      test.operator_name, score, distKm, samples.length, stats, tech
    );

    await query(
      `UPDATE drive_tests SET overall_score = :score, ai_summary = :summary WHERE drive_test_id = :id`,
      { score, summary: aiSummary, id: test.drive_test_id }
    );

    updated++;
    if (updated % 50 === 0) console.log(`  ${updated}/${tests.length} done...`);
  } catch (err) {
    errors++;
    console.error(`  [${test.drive_test_id}] Error: ${err.message}`);
  }
}

// Print summary of results
const results = await query(
  `SELECT dt.technology, o.operator_name,
     ROUND(AVG(dt.overall_score), 1) as avg_score,
     MIN(dt.overall_score) as min_score,
     MAX(dt.overall_score) as max_score,
     COUNT(*) as files
   FROM drive_tests dt
   JOIN operators o ON o.operator_id = dt.operator_id
   GROUP BY dt.technology, o.operator_name
   ORDER BY dt.technology, o.operator_name`
);

console.log(`\nDone. Updated: ${updated}, Errors: ${errors}\n`);
console.log('Score summary by technology/operator:');
console.log('Tech  | Operator  | Files | Avg Score | Min  | Max');
console.log('------+-----------+-------+-----------+------+-----');
for (const r of results) {
  console.log(`${r.technology.padEnd(5)} | ${r.operator_name.padEnd(9)} | ${String(r.files).padEnd(5)} | ${String(r.avg_score).padEnd(9)} | ${r.min_score} | ${r.max_score}`);
}

process.exit(0);
