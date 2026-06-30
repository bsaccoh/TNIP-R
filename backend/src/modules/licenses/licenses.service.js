import { query } from '../../config/db.js';

export async function listLicenses(operatorId = null) {
  return query(`
    SELECT l.license_id, l.operator_id, o.operator_name,
           l.license_number, l.technology, l.coverage_obligation,
           l.spectrum_bands, l.annual_fee, l.notes,
           l.valid_from, l.valid_to, l.created_at, l.updated_at,
           DATEDIFF(l.valid_to, CURDATE()) AS days_remaining
      FROM operator_licenses l
      JOIN operators o ON o.operator_id = l.operator_id
     WHERE (:op IS NULL OR l.operator_id = :op)
     ORDER BY l.valid_to ASC, o.operator_name
  `, { op: operatorId });
}

export async function createLicense(data) {
  const r = await query(`
    INSERT INTO operator_licenses
      (operator_id, license_number, technology, coverage_obligation,
       spectrum_bands, annual_fee, notes, valid_from, valid_to)
    VALUES (:op,:num,:tech,:cov,:spec,:fee,:notes,:from,:to)`,
    {
      op: data.operator_id, num: data.license_number ?? null,
      tech: data.technology ?? null, cov: data.coverage_obligation ?? null,
      spec: data.spectrum_bands ?? null, fee: data.annual_fee ?? null,
      notes: data.notes ?? null, from: data.valid_from ?? null, to: data.valid_to ?? null,
    });
  return (await query('SELECT l.*, o.operator_name FROM operator_licenses l JOIN operators o ON o.operator_id = l.operator_id WHERE l.license_id = :id', { id: r.insertId }))[0];
}

export async function updateLicense(id, data) {
  await query(`
    UPDATE operator_licenses SET
      license_number = :num, technology = :tech, coverage_obligation = :cov,
      spectrum_bands = :spec, annual_fee = :fee, notes = :notes,
      valid_from = :from, valid_to = :to
    WHERE license_id = :id`,
    {
      id, num: data.license_number ?? null, tech: data.technology ?? null,
      cov: data.coverage_obligation ?? null, spec: data.spectrum_bands ?? null,
      fee: data.annual_fee ?? null, notes: data.notes ?? null,
      from: data.valid_from ?? null, to: data.valid_to ?? null,
    });
  return (await query('SELECT l.*, o.operator_name FROM operator_licenses l JOIN operators o ON o.operator_id = l.operator_id WHERE l.license_id = :id', { id }))[0];
}

export async function deleteLicense(id) {
  await query('DELETE FROM operator_licenses WHERE license_id = :id', { id });
}

export async function expiryAlerts(days = 90) {
  return query(`
    SELECT l.license_id, o.operator_name, l.license_number, l.technology,
           l.valid_to, DATEDIFF(l.valid_to, CURDATE()) AS days_remaining
      FROM operator_licenses l
      JOIN operators o ON o.operator_id = l.operator_id
     WHERE l.valid_to IS NOT NULL
       AND DATEDIFF(l.valid_to, CURDATE()) BETWEEN 0 AND :days
     ORDER BY l.valid_to ASC
  `, { days });
}
