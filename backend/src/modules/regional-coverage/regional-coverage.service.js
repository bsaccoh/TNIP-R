import { query } from '../../config/db.js';

export async function listDistricts() {
  return query(
    `SELECT DISTINCT district, province FROM district_coverage ORDER BY province, district`
  );
}

export async function districtCoverage(district, operatorId) {
  return query(
    `SELECT dc.*, o.operator_name
       FROM district_coverage dc
       JOIN operators o ON o.operator_id = dc.operator_id
      WHERE dc.district = :district
        AND dc.period = (SELECT MAX(period) FROM district_coverage)
        ${operatorId ? 'AND dc.operator_id = :op' : ''}
      ORDER BY dc.coverage_pct DESC`,
    { district, ...(operatorId ? { op: operatorId } : {}) }
  );
}

export async function allDistrictsSummary(operatorId) {
  return query(
    `SELECT dc.district, dc.province, dc.population, dc.area_km2,
            o.operator_name, dc.operator_id,
            dc.coverage_pct, dc.pop_coverage_pct, dc.availability_pct,
            dc.accessibility_pct, dc.avg_download_kbps,
            dc.signal_poor_pct, dc.signal_fair_pct, dc.signal_good_pct, dc.signal_excellent_pct,
            dc.sites_count, dc.cells_2g, dc.cells_3g, dc.cells_4g, dc.cells_5g
       FROM district_coverage dc
       JOIN operators o ON o.operator_id = dc.operator_id
      WHERE dc.period = (SELECT MAX(period) FROM district_coverage)
        ${operatorId ? 'AND dc.operator_id = :op' : ''}
      ORDER BY dc.district, dc.coverage_pct DESC`,
    operatorId ? { op: operatorId } : {}
  );
}

export async function nationalSummary(operatorId) {
  return query(
    `SELECT o.operator_name, dc.operator_id,
            ROUND(AVG(dc.coverage_pct), 1) AS avg_coverage,
            ROUND(AVG(dc.pop_coverage_pct), 1) AS avg_pop_coverage,
            ROUND(AVG(dc.availability_pct), 1) AS avg_availability,
            ROUND(AVG(dc.accessibility_pct), 1) AS avg_accessibility,
            ROUND(AVG(dc.avg_download_kbps), 1) AS avg_download,
            SUM(dc.sites_count) AS total_sites,
            SUM(dc.cells_2g) AS total_2g,
            SUM(dc.cells_3g) AS total_3g,
            SUM(dc.cells_4g) AS total_4g,
            SUM(dc.cells_5g) AS total_5g,
            COUNT(DISTINCT dc.district) AS districts_covered
       FROM district_coverage dc
       JOIN operators o ON o.operator_id = dc.operator_id
      WHERE dc.period = (SELECT MAX(period) FROM district_coverage)
        ${operatorId ? 'AND dc.operator_id = :op' : ''}
      GROUP BY o.operator_name, dc.operator_id
      ORDER BY avg_coverage DESC`,
    operatorId ? { op: operatorId } : {}
  );
}
