import * as XLSX from 'xlsx';
import { query } from '../../config/db.js';

async function getComplianceData(operatorId) {
  const conds = operatorId ? 'WHERE ck.operator_id = :operatorId' : '';
  return query(`
    SELECT o.operator_name, kd.kpi_key, kd.name AS kpi_name, kd.unit, kd.category,
           ck.value, qt.required_value, qt.comparator,
           CASE
             WHEN qt.comparator='GTE' AND ck.value >= qt.required_value THEN 'PASS'
             WHEN qt.comparator='LTE' AND ck.value <= qt.required_value THEN 'PASS'
             WHEN qt.comparator='GT'  AND ck.value >  qt.required_value THEN 'PASS'
             WHEN qt.comparator='LT'  AND ck.value <  qt.required_value THEN 'PASS'
             ELSE 'FAIL'
           END AS status,
           ck.calculated_at
    FROM calculated_kpis ck
    JOIN operators o ON o.operator_id = ck.operator_id
    JOIN kpi_definitions kd ON kd.kpi_id = ck.kpi_id
    LEFT JOIN qos_thresholds qt ON qt.kpi_id = ck.kpi_id
      AND (qt.operator_id IS NULL OR qt.operator_id = ck.operator_id) AND qt.is_active = 1
    WHERE ck.calculated_at = (
      SELECT MAX(c2.calculated_at) FROM calculated_kpis c2
      WHERE c2.kpi_id = ck.kpi_id AND c2.operator_id = ck.operator_id
    ) ${operatorId ? 'AND ck.operator_id = :operatorId' : ''}
    ORDER BY o.operator_name, kd.category, kd.kpi_key
  `, operatorId ? { operatorId } : {});
}

async function getKpiData(operatorId) {
  const where = operatorId ? 'WHERE ck.operator_id = :operatorId' : '';
  return query(`
    SELECT o.operator_name, kd.kpi_key, kd.name AS kpi_name, kd.unit, kd.category,
           ROUND(AVG(ck.value),3) AS avg_value, ROUND(MIN(ck.value),3) AS min_value,
           ROUND(MAX(ck.value),3) AS max_value, COUNT(*) AS data_points,
           MAX(ck.calculated_at) AS last_updated
    FROM calculated_kpis ck
    JOIN operators o ON o.operator_id = ck.operator_id
    JOIN kpi_definitions kd ON kd.kpi_id = ck.kpi_id
    ${where} GROUP BY ck.operator_id, ck.kpi_id ORDER BY o.operator_name, kd.category
  `, operatorId ? { operatorId } : {});
}

export async function generateExcel(type, operatorId) {
  const wb = XLSX.utils.book_new();
  const now = new Date().toISOString().slice(0, 10);

  if (type === 'compliance') {
    const rows = await getComplianceData(operatorId);
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      'Operator':     r.operator_name,
      'Category':     r.category || '',
      'KPI Key':      r.kpi_key,
      'KPI Name':     r.kpi_name,
      'Unit':         r.unit,
      'Value':        r.value,
      'Threshold':    r.required_value != null ? `${r.comparator} ${r.required_value}` : 'N/A',
      'Status':       r.status || 'N/A',
      'Calculated At': r.calculated_at ? new Date(r.calculated_at).toLocaleString() : '',
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Compliance');
  } else if (type === 'kpi') {
    const rows = await getKpiData(operatorId);
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      'Operator':    r.operator_name,
      'Category':    r.category || '',
      'KPI Key':     r.kpi_key,
      'KPI Name':    r.kpi_name,
      'Unit':        r.unit,
      'Average':     r.avg_value,
      'Min':         r.min_value,
      'Max':         r.max_value,
      'Data Points': r.data_points,
      'Last Updated': r.last_updated ? new Date(r.last_updated).toLocaleString() : '',
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'KPI Summary');
  }

  // Summary sheet
  const meta = XLSX.utils.aoa_to_sheet([
    ['TNIP-R — Telecom National Intelligence Platform'],
    ['Report Type:', type.toUpperCase()],
    ['Generated:',  new Date().toLocaleString()],
    ['Period:',     now],
  ]);
  XLSX.utils.book_append_sheet(wb, meta, 'Info');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
