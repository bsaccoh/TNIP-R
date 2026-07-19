import { query } from './src/config/db.js';

const summary = await query(`
  SELECT 
    dt.technology,
    o.operator_name as operator,
    COUNT(DISTINCT dt.drive_test_id) as test_files,
    SUM(dt.total_samples) as total_samples,
    ROUND(SUM(dt.distance_km), 2) as total_km
  FROM drive_tests dt
  JOIN operators o ON dt.operator_id = o.operator_id
  GROUP BY dt.technology, o.operator_name
  ORDER BY dt.technology, o.operator_name
`);
console.log('Summary:');
summary.forEach(r => console.log(`  ${r.technology} | ${r.operator} | ${r.test_files} files | ${r.total_samples} samples | ${r.total_km} km`));

const gps = await query(`
  SELECT COUNT(*) as with_gps,
    MIN(latitude) as min_lat, MAX(latitude) as max_lat,
    MIN(longitude) as min_lon, MAX(longitude) as max_lon
  FROM drive_test_samples WHERE latitude IS NOT NULL AND latitude != 0
`);
console.log('GPS bounds:', JSON.stringify(gps[0], null, 2));
process.exit(0);
