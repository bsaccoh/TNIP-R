import { query } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

const HUAWEI_VENDOR_ID = 1;
const TECH = { '2G': 1, '3G': 2, '4G': 3, '5G': 4 };

export async function listCounters({ status, technology, search, limit, offset }) {
  const where = ['1=1'];
  const filterParams = {};
  if (status) { where.push('cd.status = :status'); filterParams.status = status; }
  if (technology && TECH[technology]) { where.push('cd.technology_id = :tid'); filterParams.tid = TECH[technology]; }
  if (search) { where.push('(cd.counter_key LIKE :s OR cd.counter_name LIKE :s)'); filterParams.s = `%${search}%`; }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const rows = await query(
    `SELECT cd.counter_id, cd.counter_key, cd.counter_name, cd.meas_type_id, cd.raw_unit,
            cd.category, cd.measurement_object, cd.aggregation, cd.status,
            v.vendor_key, t.tech_key
       FROM counter_definitions cd
       LEFT JOIN vendors v ON v.vendor_id = cd.vendor_id
       LEFT JOIN technologies t ON t.technology_id = cd.technology_id
       ${whereSql}
      ORDER BY CASE WHEN cd.status='UNKNOWN' THEN 0 ELSE 1 END, cd.counter_key
      LIMIT :limit OFFSET :offset`, { ...filterParams, limit, offset });
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM counter_definitions cd ${whereSql}`, filterParams);
  return { rows, total };
}

export async function counterStats() {
  return query(
    `SELECT t.tech_key, cd.status, COUNT(*) AS count
       FROM counter_definitions cd LEFT JOIN technologies t ON t.technology_id=cd.technology_id
      GROUP BY t.tech_key, cd.status ORDER BY t.tech_key`);
}

/**
 * Bulk import counter ID→name mappings. Upserts by (vendor, technology, counter_key),
 * marking mapped rows MAPPED. Use this once the Huawei counter reference is available.
 * @param technology '2G'|'3G'|'4G'|'5G'
 * @param mappings [{ counter_key, counter_name, category?, measurement_object?, aggregation?, unit? }]
 */
export async function importMappings({ technology, mappings }) {
  const tid = TECH[technology];
  if (!tid) throw ApiError.badRequest(`Unknown technology '${technology}'`);
  if (!Array.isArray(mappings) || !mappings.length) throw ApiError.badRequest('mappings array required');

  let upserted = 0;
  for (const m of mappings) {
    const key = String(m.counter_key ?? m.counter_id ?? '').trim();
    if (!key || !m.counter_name) continue;
    await query(
      `INSERT INTO counter_definitions
         (vendor_id, technology_id, counter_key, counter_name, category, measurement_object, aggregation, raw_unit, status)
       VALUES (:v,:t,:key,:name,:cat,:mo,:agg,:unit,'MAPPED')
       ON DUPLICATE KEY UPDATE counter_name=:name, category=:cat, measurement_object=:mo,
         aggregation=:agg, raw_unit=COALESCE(:unit, raw_unit), status='MAPPED'`,
      { v: HUAWEI_VENDOR_ID, t: tid, key, name: m.counter_name,
        cat: m.category ?? null, mo: m.measurement_object ?? null,
        agg: (m.aggregation || 'SUM').toUpperCase(), unit: m.unit ?? null });
    upserted++;
  }
  return { upserted, technology };
}

export async function createCounter({ counter_key, counter_name, technology, category, measurement_object, aggregation, unit }) {
  const tid = TECH[technology];
  if (!tid) throw ApiError.badRequest(`Unknown technology '${technology}'`);
  const key = String(counter_key).trim();
  if (!key) throw ApiError.badRequest('counter_key is required');

  const existing = await query(
    'SELECT counter_id FROM counter_definitions WHERE vendor_id=:v AND technology_id=:t AND counter_key=:key',
    { v: HUAWEI_VENDOR_ID, t: tid, key });
  if (existing.length) throw ApiError.conflict(`Counter '${key}' already exists for ${technology}`);

  await query(
    `INSERT INTO counter_definitions
       (vendor_id, technology_id, counter_key, counter_name, category, measurement_object, aggregation, raw_unit, status)
     VALUES (:v, :t, :key, :name, :cat, :mo, :agg, :unit, 'MAPPED')`,
    { v: HUAWEI_VENDOR_ID, t: tid, key, name: counter_name,
      cat: category ?? null, mo: measurement_object ?? null,
      agg: (aggregation || 'SUM').toUpperCase(), unit: unit ?? null });

  const [row] = await query(
    `SELECT cd.*, t.tech_key, v.vendor_key
       FROM counter_definitions cd
       LEFT JOIN technologies t ON t.technology_id = cd.technology_id
       LEFT JOIN vendors v ON v.vendor_id = cd.vendor_id
      WHERE cd.vendor_id=:v AND cd.technology_id=:t AND cd.counter_key=:key`,
    { v: HUAWEI_VENDOR_ID, t: tid, key });
  return row;
}

export async function updateCounter(id, fields) {
  const allowed = ['counter_key', 'counter_name', 'category', 'measurement_object', 'aggregation', 'raw_unit', 'status'];
  const sets = [];
  const params = { id };
  for (const k of allowed) if (fields[k] !== undefined) { sets.push(`${k} = :${k}`); params[k] = fields[k]; }
  if (!sets.length) throw ApiError.badRequest('No updatable fields provided');
  await query(`UPDATE counter_definitions SET ${sets.join(', ')} WHERE counter_id = :id`, params);
  const [row] = await query(
    `SELECT cd.*, t.tech_key, v.vendor_key
       FROM counter_definitions cd
       LEFT JOIN technologies t ON t.technology_id = cd.technology_id
       LEFT JOIN vendors v ON v.vendor_id = cd.vendor_id
      WHERE cd.counter_id=:id`, { id });
  if (!row) throw ApiError.notFound('Counter not found');
  return row;
}

export async function deleteCounter(id) {
  const [row] = await query('SELECT counter_id, counter_key FROM counter_definitions WHERE counter_id=:id', { id });
  if (!row) throw ApiError.notFound('Counter not found');
  const [usage] = await query('SELECT COUNT(*) AS c FROM counter_values WHERE counter_id=:id', { id });
  if (usage.c > 0) throw ApiError.conflict(`Counter is referenced by ${usage.c} data rows — cannot delete`);
  await query('DELETE FROM counter_definitions WHERE counter_id=:id', { id });
  return { deleted: true, counter_id: id, counter_key: row.counter_key };
}
