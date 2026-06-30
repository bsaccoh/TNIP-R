import { query } from '../../config/db.js';

export async function listThresholds() {
  return query(`
    SELECT t.threshold_id, t.kpi_id, k.kpi_key, k.name AS kpi_name, k.category, k.unit, k.direction,
           t.technology_id, tech.tech_key, t.operator_id, o.operator_name,
           t.comparator, t.required_value, t.warning_margin,
           t.effective_from, t.effective_to, t.is_active, t.version_no, t.created_at
      FROM qos_thresholds t
      JOIN kpi_definitions k ON k.kpi_id = t.kpi_id
      LEFT JOIN technologies tech ON tech.technology_id = t.technology_id
      LEFT JOIN operators o ON o.operator_id = t.operator_id
     ORDER BY k.category, k.kpi_key, t.operator_id IS NULL, o.operator_name
  `);
}

export async function createThreshold(data) {
  const r = await query(`
    INSERT INTO qos_thresholds
      (kpi_id, technology_id, operator_id, comparator, required_value, warning_margin,
       effective_from, effective_to, is_active, created_by)
    VALUES (:kpi_id,:tech_id,:op_id,:comparator,:required_value,:warning_margin,
            :effective_from,:effective_to,1,:created_by)`,
    {
      kpi_id: data.kpi_id, tech_id: data.technology_id ?? null,
      op_id: data.operator_id ?? null, comparator: data.comparator,
      required_value: data.required_value, warning_margin: data.warning_margin ?? 0,
      effective_from: data.effective_from, effective_to: data.effective_to ?? null,
      created_by: data.created_by ?? null,
    });
  return (await query('SELECT * FROM qos_thresholds WHERE threshold_id = :id', { id: r.insertId }))[0];
}

export async function updateThreshold(id, data) {
  await query(`
    UPDATE qos_thresholds SET
      comparator = :comparator, required_value = :required_value,
      warning_margin = :warning_margin, effective_from = :effective_from,
      effective_to = :effective_to, is_active = :is_active
    WHERE threshold_id = :id`,
    {
      id, comparator: data.comparator, required_value: data.required_value,
      warning_margin: data.warning_margin ?? 0, effective_from: data.effective_from,
      effective_to: data.effective_to ?? null, is_active: data.is_active ? 1 : 0,
    });
  return (await query('SELECT * FROM qos_thresholds WHERE threshold_id = :id', { id }))[0];
}

export async function deleteThreshold(id) {
  await query('DELETE FROM qos_thresholds WHERE threshold_id = :id', { id });
}
