import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const VOLTE_KPIS = [
  // VoLTE Accessibility
  { kpi_key: 'VOLTE_ERAB_SSR', name: 'VoLTE E-RAB Setup Success Rate', unit: '%', category: 'VoLTE', direction: 'HIGHER_BETTER', description: 'Percentage of successful E-RAB establishments for VoLTE bearers' },
  { kpi_key: 'VOLTE_CSSR', name: 'VoLTE Call Setup Success Rate', unit: '%', category: 'VoLTE', direction: 'HIGHER_BETTER', description: 'End-to-end VoLTE call setup success rate including SIP signaling and bearer setup' },
  { kpi_key: 'SIP_REG_SR', name: 'SIP Registration Success Rate', unit: '%', category: 'IMS', direction: 'HIGHER_BETTER', description: 'Percentage of successful SIP REGISTER requests at IMS core (P-CSCF/S-CSCF)' },
  { kpi_key: 'VOLTE_RRC_SSR', name: 'VoLTE RRC Setup Success Rate', unit: '%', category: 'VoLTE', direction: 'HIGHER_BETTER', description: 'RRC connection setup success rate for VoLTE dedicated bearers (QCI 1)' },

  // VoLTE Retainability
  { kpi_key: 'VOLTE_DCR', name: 'VoLTE Drop Call Rate', unit: '%', category: 'VoLTE', direction: 'LOWER_BETTER', description: 'Percentage of VoLTE calls dropped after successful setup' },
  { kpi_key: 'VOLTE_ERAB_DR', name: 'VoLTE E-RAB Drop Rate', unit: '%', category: 'VoLTE', direction: 'LOWER_BETTER', description: 'E-RAB abnormal release rate for QCI 1 bearers (VoLTE voice)' },

  // VoLTE Quality
  { kpi_key: 'VOLTE_MOS', name: 'VoLTE Mean Opinion Score', unit: 'score', category: 'VoLTE', direction: 'HIGHER_BETTER', description: 'Estimated voice quality score (1-5) for VoLTE calls based on codec and network conditions' },
  { kpi_key: 'VOLTE_JITTER', name: 'VoLTE Jitter', unit: 'ms', category: 'VoLTE', direction: 'LOWER_BETTER', description: 'Average packet delay variation for VoLTE RTP streams' },
  { kpi_key: 'VOLTE_LATENCY', name: 'VoLTE Call Setup Latency', unit: 'ms', category: 'VoLTE', direction: 'LOWER_BETTER', description: 'Average time from SIP INVITE to 180 Ringing for VoLTE calls' },
  { kpi_key: 'VOLTE_PACKET_LOSS', name: 'VoLTE Packet Loss Rate', unit: '%', category: 'VoLTE', direction: 'LOWER_BETTER', description: 'RTP packet loss percentage on VoLTE voice bearers' },

  // VoLTE Mobility
  { kpi_key: 'VOLTE_HOSR', name: 'VoLTE Handover Success Rate', unit: '%', category: 'VoLTE', direction: 'HIGHER_BETTER', description: 'Handover success rate for active VoLTE calls (intra-LTE and inter-RAT SRVCC)' },
  { kpi_key: 'SRVCC_SR', name: 'SRVCC Success Rate', unit: '%', category: 'VoLTE', direction: 'HIGHER_BETTER', description: 'Single Radio Voice Call Continuity success rate — VoLTE to CS fallback handover' },
  { kpi_key: 'CSFB_SR', name: 'CSFB Success Rate', unit: '%', category: 'VoLTE', direction: 'HIGHER_BETTER', description: 'Circuit-Switched Fallback success rate for devices not supporting VoLTE' },

  // IMS Core
  { kpi_key: 'IMS_REG_USERS', name: 'IMS Registered Users', unit: 'count', category: 'IMS', direction: 'HIGHER_BETTER', description: 'Number of active IMS-registered subscribers' },
  { kpi_key: 'IMS_SESSION_SR', name: 'IMS Session Setup Success Rate', unit: '%', category: 'IMS', direction: 'HIGHER_BETTER', description: 'SIP session establishment success rate at S-CSCF' },
  { kpi_key: 'IMS_SESSION_DR', name: 'IMS Session Drop Rate', unit: '%', category: 'IMS', direction: 'LOWER_BETTER', description: 'Abnormal SIP session termination rate at IMS core' },

  // VoLTE Utilization
  { kpi_key: 'VOLTE_TRAFFIC_ERLANG', name: 'VoLTE Traffic (Erlang)', unit: 'Erlang', category: 'VoLTE', direction: 'HIGHER_BETTER', description: 'Total VoLTE voice traffic in Erlang' },
  { kpi_key: 'VOLTE_ATTACH_SR', name: 'VoLTE Attach Success Rate', unit: '%', category: 'VoLTE', direction: 'HIGHER_BETTER', description: 'Percentage of successful IMS PDN connections (APN ims)' },
];

const VOLTE_FORMULAS = [
  { kpi_key: 'VOLTE_ERAB_SSR', expression: '(L.E-RAB.Succ.VoLTE / L.E-RAB.Att.VoLTE) * 100' },
  { kpi_key: 'VOLTE_CSSR', expression: '(L.VoLTE.CallSetup.Succ / L.VoLTE.CallSetup.Att) * 100' },
  { kpi_key: 'SIP_REG_SR', expression: '(L.SIP.Register.Succ / L.SIP.Register.Att) * 100' },
  { kpi_key: 'VOLTE_RRC_SSR', expression: '(L.RRC.ConnSetup.Succ.VoLTE / L.RRC.ConnSetup.Att.VoLTE) * 100' },
  { kpi_key: 'VOLTE_DCR', expression: '(L.VoLTE.Call.Drop / L.VoLTE.Call.Setup.Succ) * 100' },
  { kpi_key: 'VOLTE_ERAB_DR', expression: '(L.E-RAB.AbnormRel.VoLTE / L.E-RAB.Succ.VoLTE) * 100' },
  { kpi_key: 'VOLTE_HOSR', expression: '(L.HO.Succ.VoLTE / L.HO.Att.VoLTE) * 100' },
  { kpi_key: 'SRVCC_SR', expression: '(L.SRVCC.HO.Succ / L.SRVCC.HO.Att) * 100' },
  { kpi_key: 'CSFB_SR', expression: '(L.CSFB.Succ / L.CSFB.Att) * 100' },
  { kpi_key: 'VOLTE_ATTACH_SR', expression: '(L.IMS.PDN.Conn.Succ / L.IMS.PDN.Conn.Att) * 100' },
  { kpi_key: 'IMS_SESSION_SR', expression: '(L.IMS.Session.Setup.Succ / L.IMS.Session.Setup.Att) * 100' },
  { kpi_key: 'IMS_SESSION_DR', expression: '(L.IMS.Session.AbnormRel / L.IMS.Session.Setup.Succ) * 100' },
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });

  console.log('Seeding VoLTE / IMS KPI definitions...');
  let created = 0, skipped = 0;

  for (const kpi of VOLTE_KPIS) {
    const [existing] = await conn.query('SELECT kpi_id FROM kpi_definitions WHERE kpi_key = ?', [kpi.kpi_key]);
    if (existing.length) { skipped++; continue; }
    await conn.query(
      'INSERT INTO kpi_definitions (kpi_key, name, unit, category, direction, description) VALUES (?, ?, ?, ?, ?, ?)',
      [kpi.kpi_key, kpi.name, kpi.unit, kpi.category, kpi.direction, kpi.description]
    );
    created++;
  }
  console.log(`  KPI definitions: ${created} created, ${skipped} already existed`);

  console.log('Seeding VoLTE / IMS formulas (Huawei counter patterns)...');
  let fCreated = 0;
  for (const f of VOLTE_FORMULAS) {
    const [kpiRow] = await conn.query('SELECT kpi_id FROM kpi_definitions WHERE kpi_key = ?', [f.kpi_key]);
    if (!kpiRow.length) continue;
    const kpiId = kpiRow[0].kpi_id;
    const [existing] = await conn.query(
      'SELECT formula_id FROM kpi_formulas WHERE kpi_id = ? AND is_active = 1', [kpiId]
    );
    if (existing.length) continue;
    await conn.query(
      'INSERT INTO kpi_formulas (kpi_id, expression, vendor_id, is_active) VALUES (?, ?, 1, 1)',
      [kpiId, f.expression]
    );
    fCreated++;
  }
  console.log(`  Formulas: ${fCreated} created`);

  // Seed QoS thresholds for compliance
  console.log('Seeding VoLTE compliance thresholds...');
  const thresholds = [
    { kpi_key: 'VOLTE_CSSR', comparator: 'GTE', value: 98.0 },
    { kpi_key: 'VOLTE_DCR', comparator: 'LTE', value: 1.0 },
    { kpi_key: 'VOLTE_ERAB_SSR', comparator: 'GTE', value: 99.0 },
    { kpi_key: 'VOLTE_HOSR', comparator: 'GTE', value: 97.0 },
    { kpi_key: 'SRVCC_SR', comparator: 'GTE', value: 95.0 },
    { kpi_key: 'SIP_REG_SR', comparator: 'GTE', value: 99.0 },
    { kpi_key: 'IMS_SESSION_SR', comparator: 'GTE', value: 98.0 },
    { kpi_key: 'VOLTE_PACKET_LOSS', comparator: 'LTE', value: 1.0 },
  ];
  let tCreated = 0;
  for (const t of thresholds) {
    const [kpiRow] = await conn.query('SELECT kpi_id FROM kpi_definitions WHERE kpi_key = ?', [t.kpi_key]);
    if (!kpiRow.length) continue;
    const [existing] = await conn.query(
      'SELECT threshold_id FROM qos_thresholds WHERE kpi_id = ?', [kpiRow[0].kpi_id]
    );
    if (existing.length) continue;
    await conn.query(
      'INSERT INTO qos_thresholds (kpi_id, comparator, required_value, effective_from) VALUES (?, ?, ?, CURDATE())',
      [kpiRow[0].kpi_id, t.comparator, t.value]
    );
    tCreated++;
  }
  console.log(`  Thresholds: ${tCreated} created`);

  await conn.end();
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
