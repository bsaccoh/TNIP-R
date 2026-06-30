import { query } from '../../config/db.js';
import * as xlsx from 'xlsx';

export async function generateOperatorKpiReport(operatorId, from, to) {
  return query(`
    SELECT o.operator_name, k.kpi_key, k.name AS kpi_name, k.category,
           DATE(ck.ts) AS date, ROUND(AVG(ck.value), 4) AS avg_value,
           ROUND(MIN(ck.value), 4) AS min_value, ROUND(MAX(ck.value), 4) AS max_value,
           COUNT(*) AS cell_count, k.unit
    FROM calculated_kpis ck
    JOIN operators o ON o.operator_id = ck.operator_id
    JOIN kpi_definitions k ON k.kpi_id = ck.kpi_id
    WHERE ck.granularity = 'DAY'
      AND (o.operator_id = :operatorId OR :operatorId IS NULL)
      ${from ? 'AND ck.ts >= :from' : ''}
      ${to ? 'AND ck.ts <= :to' : ''}
    GROUP BY o.operator_name, k.kpi_key, k.name, k.category, DATE(ck.ts), k.unit
    ORDER BY date DESC, o.operator_name, k.category, k.kpi_key
  `, { operatorId: operatorId || null, from, to });
}

export async function generateComplianceReport(operatorId, from, to) {
  return query(`
    SELECT o.operator_name, k.kpi_key, k.name AS kpi_name, k.category,
           t.tech_key AS technology, cr.status, ROUND(cr.value, 4) AS measured_value,
           cr.required_value AS threshold, qt.comparator, cr.period
    FROM compliance_results cr
    JOIN operators o ON o.operator_id = cr.operator_id
    JOIN kpi_definitions k ON k.kpi_id = cr.kpi_id
    LEFT JOIN technologies t ON t.technology_id = cr.technology_id
    LEFT JOIN qos_thresholds qt ON qt.threshold_id = cr.threshold_id
    WHERE (o.operator_id = :operatorId OR :operatorId IS NULL)
      ${from ? 'AND cr.period >= :from' : ''}
      ${to ? 'AND cr.period <= :to' : ''}
    ORDER BY cr.period DESC, o.operator_name, k.kpi_key
  `, { operatorId: operatorId || null, from, to });
}

export async function generateTrendReport(operatorId, from, to) {
  return query(`
    SELECT o.operator_name, k.kpi_key, k.name AS kpi_name, k.category,
           DATE(ck.ts) AS date, ROUND(AVG(ck.value), 4) AS daily_avg,
           COUNT(DISTINCT ck.cell_id) AS cells_reporting, k.unit
    FROM calculated_kpis ck
    JOIN operators o ON o.operator_id = ck.operator_id
    JOIN kpi_definitions k ON k.kpi_id = ck.kpi_id
    WHERE ck.granularity = 'DAY'
      AND (o.operator_id = :operatorId OR :operatorId IS NULL)
      ${from ? 'AND ck.ts >= :from' : ''}
      ${to ? 'AND ck.ts <= :to' : ''}
    GROUP BY o.operator_name, k.kpi_key, k.name, k.category, DATE(ck.ts), k.unit
    ORDER BY o.operator_name, k.kpi_key, date
  `, { operatorId: operatorId || null, from, to });
}

export async function generateAnomalyReport(operatorId) {
  return query(`
    SELECT o.operator_name, k.kpi_key, k.name AS kpi_name,
           ad.cell_id, ad.ts AS timestamp, ROUND(ad.value, 4) AS value,
           ROUND(ad.expected, 4) AS expected, ROUND(ad.deviation, 2) AS z_score,
           ad.severity, ad.method
    FROM anomaly_detections ad
    JOIN operators o ON o.operator_id = ad.operator_id
    JOIN kpi_definitions k ON k.kpi_id = ad.kpi_id
    WHERE (o.operator_id = :operatorId OR :operatorId IS NULL)
    ORDER BY ad.severity DESC, ABS(ad.deviation) DESC
    LIMIT 5000
  `, { operatorId: operatorId || null });
}

export function buildExcelBuffer(rows, sheetName = 'Report') {
  const ws = xlsx.utils.json_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
