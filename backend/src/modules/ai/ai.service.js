import { query } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { llmEnabled, llmComplete } from './ai.provider.js';
import { createNotification } from '../notifications/notifications.service.js';

// ─── Anomaly detection (z-score over each operator+KPI daily series) ─────────
export async function detectAnomalies({ operatorId = null, threshold = 2.5 } = {}) {
  const where = operatorId != null ? 'AND ck.operator_id = :op' : '';
  const series = await query(
    `SELECT ck.operator_id, ck.kpi_id, k.kpi_key, ck.cell_id, ck.ts, ck.value
       FROM calculated_kpis ck JOIN kpi_definitions k ON k.kpi_id=ck.kpi_id
      WHERE ck.granularity='DAY' ${where}
      ORDER BY ck.operator_id, ck.kpi_id, ck.ts`,
    operatorId != null ? { op: operatorId } : {}
  );

  // group by operator+kpi
  const groups = new Map();
  for (const r of series) {
    const key = `${r.operator_id}|${r.kpi_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const anomalies = [];
  for (const rows of groups.values()) {
    const vals = rows.map((r) => r.value).filter((v) => v != null);
    if (vals.length < 4) continue;
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance);
    if (std === 0) continue;
    for (const r of rows) {
      if (r.value == null) continue;
      const z = (r.value - mean) / std;
      if (Math.abs(z) >= threshold) {
        anomalies.push({
          operatorId: r.operator_id, kpiKey: r.kpi_key, cellId: r.cell_id,
          ts: r.ts, value: r.value, expected: Number(mean.toFixed(3)),
          deviation: Number(z.toFixed(2)),
          severity: Math.abs(z) >= 3.5 ? 'HIGH' : Math.abs(z) >= 3 ? 'MEDIUM' : 'LOW',
        });
      }
    }
  }
  return anomalies;
}

/** Persist detected anomalies and derive recommendations. */
export async function runAnomalyScan(operatorId = null) {
  const anomalies = await detectAnomalies({ operatorId });
  let alertsDispatched = 0;

  for (const a of anomalies) {
    await query(
      `INSERT INTO anomaly_detections (operator_id, kpi_id, cell_id, ts, value, expected, deviation, method, severity)
       SELECT :op, k.kpi_id, :cell, :ts, :val, :exp, :dev, 'zscore', :sev
         FROM kpi_definitions k WHERE k.kpi_key = :kpi`,
      { op: a.operatorId, cell: a.cellId, ts: a.ts, val: a.value, exp: a.expected, dev: a.deviation, sev: a.severity, kpi: a.kpiKey }
    );

    if (a.severity === 'HIGH' || a.severity === 'CRITICAL') {
      const operatorNameRes = await query('SELECT operator_name FROM operators WHERE operator_id = :op', { op: a.operatorId });
      const opName = operatorNameRes[0]?.operator_name || 'Unknown Operator';
      const title = `AI Anomaly Detected: ${a.kpiKey} — ${opName}`;
      const body = `Statistical anomaly detected (Severity: ${a.severity}). ${a.kpiKey} deviation of ${a.deviation}σ. Expected: ${a.expected}, Actual: ${a.value}.`;

      // Avoid spamming duplicate notifications for the same operator and KPI in the last 24h
      const [{ cnt }] = await query(
        `SELECT COUNT(*) AS cnt FROM notifications WHERE title = :title AND created_at > NOW() - INTERVAL 24 HOUR`,
        { title }
      );
      if (Number(cnt) === 0) {
        await createNotification({ operatorId: null, title, body });
        alertsDispatched++;
      }
    }
  }
  return { detected: anomalies.length, alertsDispatched };
}

// ─── Conversational assistant — deterministic intent router ─────────────────
// Each intent owns a parameterized SQL query, so answers are grounded in data.
// When llmEnabled(), free-form questions fall through to Claude with this same
// data as context.

async function operatorList() {
  return query('SELECT operator_id, operator_name FROM operators WHERE deleted_at IS NULL');
}

const INTENTS = [
  {
    name: 'highest_kpi',
    match: (q) => /which operator.*(highest|best)/.test(q),
    run: async (q) => {
      const kpi = guessKpi(q) || 'CELL_AVAILABILITY';
      const rows = await query(
        `SELECT o.operator_name, AVG(ck.value) AS value
           FROM calculated_kpis ck JOIN operators o ON o.operator_id=ck.operator_id
           JOIN kpi_definitions k ON k.kpi_id=ck.kpi_id
          WHERE k.kpi_key=:kpi AND ck.granularity='DAY'
          GROUP BY o.operator_name ORDER BY value DESC LIMIT 1`, { kpi });
      if (!rows.length) return { answer: `No data for ${kpi}.`, data: [] };
      return { answer: `${rows[0].operator_name} has the highest ${kpi} at ${Number(rows[0].value).toFixed(2)}.`, data: rows };
    },
  },
  {
    name: 'violations',
    match: (q) => /(violat|fail|breach|sla)/.test(q),
    run: async () => {
      const rows = await query(
        `SELECT o.operator_name, k.kpi_key, cr.value, cr.required_value, cr.period
           FROM compliance_results cr JOIN operators o ON o.operator_id=cr.operator_id
           JOIN kpi_definitions k ON k.kpi_id=cr.kpi_id
          WHERE cr.status='FAIL' ORDER BY cr.period DESC LIMIT 25`);
      return { answer: rows.length ? `${rows.length} threshold violation(s) found.` : 'No violations on record.', data: rows };
    },
  },
  {
    name: 'congested_sites',
    match: (q) => /congest/.test(q),
    run: async () => {
      const rows = await query(
        `SELECT o.operator_name, c.cell_code, AVG(ck.value) AS prb_util
           FROM calculated_kpis ck JOIN kpi_definitions k ON k.kpi_id=ck.kpi_id
           JOIN cells c ON c.cell_id=ck.cell_id JOIN operators o ON o.operator_id=ck.operator_id
          WHERE k.kpi_key='PRB_UTIL' AND ck.granularity='DAY'
          GROUP BY o.operator_name, c.cell_code HAVING prb_util > 70
          ORDER BY prb_util DESC LIMIT 25`);
      return { answer: rows.length ? `${rows.length} congested cell(s) (PRB > 70%).` : 'No congested cells detected.', data: rows };
    },
  },
  {
    name: 'compare_operators',
    match: (q) => /compare/.test(q),
    run: async (q) => {
      const kpi = guessKpi(q) || 'CALL_DROP_RATE';
      const ops = await operatorList();
      const named = ops.filter((o) => q.includes(o.operator_name.toLowerCase()));
      const filter = named.length ? `AND ck.operator_id IN (${named.map((o) => o.operator_id).join(',')})` : '';
      const rows = await query(
        `SELECT o.operator_name, AVG(ck.value) AS value
           FROM calculated_kpis ck JOIN operators o ON o.operator_id=ck.operator_id
           JOIN kpi_definitions k ON k.kpi_id=ck.kpi_id
          WHERE k.kpi_key=:kpi AND ck.granularity='DAY' ${filter}
          GROUP BY o.operator_name ORDER BY value DESC`, { kpi });
      return { answer: `Comparison on ${kpi}.`, data: rows };
    },
  },
];

function guessKpi(q) {
  const map = {
    availability: 'CELL_AVAILABILITY', 'drop': 'CALL_DROP_RATE', cssr: 'CSSR',
    handover: 'HOSR', throughput: 'DL_THROUGHPUT', accessibility: 'CSSR', prb: 'PRB_UTIL',
  };
  for (const [kw, kpi] of Object.entries(map)) if (q.includes(kw)) return kpi;
  return null;
}

/** Answer a natural-language regulatory question. */
export async function ask(question) {
  const q = String(question || '').toLowerCase().trim();
  if (!q) return { answer: 'Please ask a question.', data: [], source: 'router' };

  for (const intent of INTENTS) {
    if (intent.match(q)) {
      const result = await intent.run(q);
      return { ...result, source: 'router', intent: intent.name };
    }
  }

  // Fallback: LLM if configured, else a helpful default.
  if (llmEnabled()) {
    try {
      const context = JSON.stringify(await snapshotContext());
      const answer = await llmComplete({
        system: 'You are a telecom regulatory analyst. Answer concisely using ONLY the provided JSON data. If the data does not contain the answer, say so.',
        user: `Data:\n${context}\n\nQuestion: ${question}`,
      });
      return { answer, data: [], source: 'llm' };
    } catch (err) {
      logger.warn(`LLM fallback failed: ${err.message}`);
    }
  }
  return {
    answer: "I can answer questions about operator KPIs, compliance violations, congestion, and comparisons. Try: 'Which operator has the highest availability?' or 'Compare Orange and Africell on call drop rate.'",
    data: [], source: 'router', intent: 'fallback',
  };
}

/** Compact snapshot passed to the LLM as grounding context. */
async function snapshotContext() {
  const kpis = await query(
    `SELECT o.operator_name, k.kpi_key, ROUND(AVG(ck.value),2) AS value
       FROM calculated_kpis ck JOIN operators o ON o.operator_id=ck.operator_id
       JOIN kpi_definitions k ON k.kpi_id=ck.kpi_id
      WHERE ck.granularity='DAY' GROUP BY o.operator_name, k.kpi_key`);
  const compliance = await query(
    `SELECT o.operator_name, k.kpi_key, cr.status, cr.value, cr.required_value
       FROM compliance_results cr JOIN operators o ON o.operator_id=cr.operator_id
       JOIN kpi_definitions k ON k.kpi_id=cr.kpi_id`);
  return { kpis, compliance };
}
