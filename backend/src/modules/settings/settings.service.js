import { query } from '../../config/db.js';

export async function getAll() {
  const rows = await query('SELECT setting_key, value FROM application_settings ORDER BY setting_key');
  return Object.fromEntries(rows.map((r) => [r.setting_key, r.value]));
}

export async function setMany(updates) {
  for (const [k, v] of Object.entries(updates)) {
    await query(
      `INSERT INTO application_settings (setting_key, value) VALUES (:k, :v)
       ON DUPLICATE KEY UPDATE value = :v`,
      { k, v: String(v) }
    );
  }
  return getAll();
}
