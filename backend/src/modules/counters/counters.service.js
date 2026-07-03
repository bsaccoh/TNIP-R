import { query } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

const HUAWEI_VENDOR_ID = 1;
const TECH = { '2G': 1, '3G': 2, '4G': 3, '5G': 4 };

// counter_definitions was originally a shared (vendor-scoped) catalog. This adds
// an optional operator_id so counters can be tagged to a specific operator.
// NULL = global/shared counter. Runs once (idempotent).
let _schemaReady = null;
function ensureOperatorColumn() {
  if (!_schemaReady) {
    _schemaReady = (async () => {
      const [col] = await query(
        `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'counter_definitions'
            AND COLUMN_NAME = 'operator_id'`);
      if (!col || Number(col.n) === 0) {
        await query(`ALTER TABLE counter_definitions ADD COLUMN operator_id INT NULL`);
      }
    })().catch((e) => { _schemaReady = null; throw e; });
  }
  return _schemaReady;
}

export async function listCounters({ status, technology, search, operatorId, vendorId, limit, offset }) {
  await ensureOperatorColumn();
  const where = ['1=1'];
  const filterParams = {};
  if (status) { where.push('cd.status = :status'); filterParams.status = status; }
  if (technology && TECH[technology]) { where.push('cd.technology_id = :tid'); filterParams.tid = TECH[technology]; }
  if (search) { where.push('(cd.counter_key LIKE :s OR cd.counter_name LIKE :s)'); filterParams.s = `%${search}%`; }
  if (operatorId === 'null') { where.push('cd.operator_id IS NULL'); }
  else if (operatorId != null && operatorId !== '') { where.push('cd.operator_id = :opId'); filterParams.opId = Number(operatorId); }
  if (vendorId != null && vendorId !== '') { where.push('cd.vendor_id = :vId'); filterParams.vId = Number(vendorId); }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const rows = await query(
    `SELECT cd.counter_id, cd.counter_key, cd.counter_name, cd.meas_type_id, cd.raw_unit,
            cd.category, cd.measurement_object, cd.aggregation, cd.status,
            cd.operator_id, o.operator_name,
            v.vendor_key, t.tech_key
       FROM counter_definitions cd
       LEFT JOIN vendors v ON v.vendor_id = cd.vendor_id
       LEFT JOIN technologies t ON t.technology_id = cd.technology_id
       LEFT JOIN operators o ON o.operator_id = cd.operator_id
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

export async function listVendors() {
  // Some deployments lack a vendor_name column; select it only if present.
  const [col] = await query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND COLUMN_NAME = 'vendor_name'`);
  const hasName = col && Number(col.n) > 0;
  return query(
    `SELECT vendor_id, vendor_key${hasName ? ', vendor_name' : ', vendor_key AS vendor_name'} FROM vendors ORDER BY vendor_key`);
}

export async function createCounter({ counter_key, counter_name, technology, category, measurement_object, aggregation, unit, operator_id, vendor_id }) {
  await ensureOperatorColumn();
  const tid = TECH[technology];
  if (!tid) throw ApiError.badRequest(`Unknown technology '${technology}'`);
  const key = String(counter_key).trim();
  if (!key) throw ApiError.badRequest('counter_key is required');
  const opId = operator_id != null && operator_id !== '' ? Number(operator_id) : null;
  const vId = vendor_id != null && vendor_id !== '' ? Number(vendor_id) : HUAWEI_VENDOR_ID;

  const existing = await query(
    `SELECT counter_id FROM counter_definitions
      WHERE vendor_id=:v AND technology_id=:t AND counter_key=:key
        AND ${opId == null ? 'operator_id IS NULL' : 'operator_id = :opId'}`,
    { v: vId, t: tid, key, opId });
  if (existing.length) throw ApiError.conflict(`Counter '${key}' already exists for ${technology}`);

  await query(
    `INSERT INTO counter_definitions
       (vendor_id, technology_id, operator_id, counter_key, counter_name, category, measurement_object, aggregation, raw_unit, status)
     VALUES (:v, :t, :opId, :key, :name, :cat, :mo, :agg, :unit, 'MAPPED')`,
    { v: vId, t: tid, opId, key, name: counter_name,
      cat: category ?? null, mo: measurement_object ?? null,
      agg: (aggregation || 'SUM').toUpperCase(), unit: unit ?? null });

  const [row] = await query(
    `SELECT cd.*, t.tech_key, v.vendor_key, o.operator_name
       FROM counter_definitions cd
       LEFT JOIN technologies t ON t.technology_id = cd.technology_id
       LEFT JOIN vendors v ON v.vendor_id = cd.vendor_id
       LEFT JOIN operators o ON o.operator_id = cd.operator_id
      WHERE cd.vendor_id=:v AND cd.technology_id=:t AND cd.counter_key=:key
        AND ${opId == null ? 'cd.operator_id IS NULL' : 'cd.operator_id = :opId'}`,
    { v: vId, t: tid, key, opId });
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
