import { query } from '../../config/db.js';

/*
 * SLA Dashboard — unifies license obligations, KPI compliance and penalty
 * exposure into a single per-operator accountability view with RAG status.
 *
 * Reads existing tables (no new tables created):
 *   license_obligations · kpi_measurements · kpi_thresholds · penalty_assessments
 */

/* ── RAG helpers ─────────────────────────────────────────────────────────── */
function ragFromScore(score) {
  if (score >= 80) return 'GREEN';
  if (score >= 55) return 'AMBER';
  return 'RED';
}

/* ── Per-operator obligation breakdown ───────────────────────────────────── */
async function obligationBreakdown(operatorId) {
  const [row] = await query(`
    SELECT
      COUNT(*)                              AS total,
      SUM(status='FULFILLED')               AS fulfilled,
      SUM(status='ON_TRACK')                AS on_track,
      SUM(status='AT_RISK')                 AS at_risk,
      SUM(status='BREACHED')                AS breached,
      SUM(status='PENDING')                 AS pending,
      SUM(status='WAIVED')                  AS waived,
      SUM(status='BREACHED' AND breach_severity='CRITICAL') AS critical_breaches
      FROM license_obligations
     WHERE operator_id = :operatorId`, { operatorId })
    .catch(() => [{}]);

  const total    = Number(row?.total || 0);
  const waived   = Number(row?.waived || 0);
  const graded   = total - waived; // waived obligations are excluded from scoring
  const met      = Number(row?.fulfilled || 0) + Number(row?.on_track || 0);
  const compliance = graded > 0 ? (met / graded) * 100 : null;

  return {
    total,
    fulfilled: Number(row?.fulfilled || 0),
    onTrack:   Number(row?.on_track || 0),
    atRisk:    Number(row?.at_risk || 0),
    breached:  Number(row?.breached || 0),
    pending:   Number(row?.pending || 0),
    waived,
    criticalBreaches: Number(row?.critical_breaches || 0),
    compliance: compliance != null ? +compliance.toFixed(1) : null,
  };
}

/* ── Per-operator KPI compliance (last N days) ───────────────────────────── */
async function kpiCompliance(operatorId, days = 30) {
  const [row] = await query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE
        WHEN t.direction='above' AND m.value >= t.threshold_value THEN 1
        WHEN t.direction='below' AND m.value <= t.threshold_value THEN 1
        ELSE 0 END) AS passing
      FROM kpi_measurements m
      JOIN kpi_thresholds t ON t.kpi_name = m.kpi_name
        AND (t.technology IS NULL OR t.technology = m.technology)
        AND t.active = 1
     WHERE m.operator_id = :operatorId
       AND m.period_start >= DATE_SUB(NOW(), INTERVAL :days DAY)`, { operatorId, days })
    .catch(() => [{ total: 0, passing: 0 }]);

  const total = Number(row?.total || 0);
  const pass  = Number(row?.passing || 0);
  return {
    total, passing: pass,
    compliance: total > 0 ? +((pass / total) * 100).toFixed(1) : null,
  };
}

/* ── Per-operator penalty exposure ───────────────────────────────────────── */
async function penaltyExposure(operatorId) {
  const [row] = await query(`
    SELECT
      COUNT(*)                                           AS total,
      SUM(status IN ('ISSUED','ACKNOWLEDGED','DISPUTED')) AS open_count,
      COALESCE(SUM(CASE WHEN status IN ('ISSUED','ACKNOWLEDGED','DISPUTED')
                        THEN final_fine ELSE 0 END), 0)  AS outstanding,
      COALESCE(SUM(final_fine), 0)                       AS total_fined,
      MAX(currency)                                      AS currency
      FROM penalty_assessments
     WHERE operator_id = :operatorId
       AND status <> 'DRAFT'`, { operatorId })
    .catch(() => [{}]);

  return {
    total:       Number(row?.total || 0),
    openCount:   Number(row?.open_count || 0),
    outstanding: Number(row?.outstanding || 0),
    totalFined:  Number(row?.total_fined || 0),
    currency:    row?.currency || 'SLL',
  };
}

/* ── Composite SLA score for one operator ────────────────────────────────── */
function computeScore({ obl, kpi, pen }) {
  // Weighted composite. Missing components are re-weighted proportionally.
  const parts = [];
  if (obl.compliance != null) parts.push({ w: 0.5, v: obl.compliance });
  if (kpi.compliance != null) parts.push({ w: 0.35, v: kpi.compliance });

  let base;
  if (parts.length) {
    const wSum = parts.reduce((s, p) => s + p.w, 0);
    base = parts.reduce((s, p) => s + (p.w / wSum) * p.v, 0);
  } else {
    base = 100; // no data → assume compliant until proven otherwise
  }

  // Penalties for open assessments (up to -15), critical breaches (up to -20)
  const penPenalty = Math.min(15, pen.openCount * 5);
  const critPenalty = Math.min(20, obl.criticalBreaches * 10);

  const score = Math.max(0, Math.min(100, Math.round(base - penPenalty - critPenalty)));
  return score;
}

/* ── Dashboard: all operators ────────────────────────────────────────────── */
export async function slaOverview({ days = 30 } = {}) {
  const operators = await query(
    `SELECT operator_id, operator_name FROM operators WHERE status='ACTIVE' ORDER BY operator_name`
  ).catch(() => []);

  const scorecards = await Promise.all(operators.map(async (op) => {
    const [obl, kpi, pen] = await Promise.all([
      obligationBreakdown(op.operator_id),
      kpiCompliance(op.operator_id, days),
      penaltyExposure(op.operator_id),
    ]);
    const score = computeScore({ obl, kpi, pen });
    return {
      operatorId:   op.operator_id,
      operatorName: op.operator_name,
      score,
      rag: ragFromScore(score),
      obligations: obl,
      kpi,
      penalties: pen,
    };
  }));

  // Sort worst-first (RED, then lowest score)
  scorecards.sort((a, b) => a.score - b.score);

  const summary = {
    operators:  scorecards.length,
    green:      scorecards.filter((s) => s.rag === 'GREEN').length,
    amber:      scorecards.filter((s) => s.rag === 'AMBER').length,
    red:        scorecards.filter((s) => s.rag === 'RED').length,
    avgScore:   scorecards.length
      ? Math.round(scorecards.reduce((s, o) => s + o.score, 0) / scorecards.length)
      : null,
    totalBreached: scorecards.reduce((s, o) => s + o.obligations.breached, 0),
    totalOpenPenalties: scorecards.reduce((s, o) => s + o.penalties.openCount, 0),
  };

  return { summary, scorecards };
}

/* ── Operator detail: scorecard + breach timeline + obligation list ──────── */
export async function slaOperatorDetail(operatorId, { days = 30 } = {}) {
  const [op] = await query(
    `SELECT operator_id, operator_name, status FROM operators WHERE operator_id = :operatorId`,
    { operatorId });
  if (!op) return null;

  const [obl, kpi, pen] = await Promise.all([
    obligationBreakdown(operatorId),
    kpiCompliance(operatorId, days),
    penaltyExposure(operatorId),
  ]);
  const score = computeScore({ obl, kpi, pen });

  // Full obligation list
  const obligations = await query(`
    SELECT obligation_id, obligation_ref, title, obligation_type, category,
           target_value, target_unit, current_value, due_date,
           status, breach_severity,
           DATEDIFF(due_date, CURDATE()) AS days_to_due
      FROM license_obligations
     WHERE operator_id = :operatorId
     ORDER BY FIELD(status,'BREACHED','AT_RISK','PENDING','ON_TRACK','FULFILLED','WAIVED'),
              due_date ASC`, { operatorId }).catch(() => []);

  // Breach timeline: obligation breaches + penalty issuances, chronological
  const oblEvents = await query(`
    SELECT 'OBLIGATION_BREACH' AS event_type,
           obligation_ref AS ref, title,
           breach_severity AS severity,
           updated_at AS event_date
      FROM license_obligations
     WHERE operator_id = :operatorId AND status = 'BREACHED'
     ORDER BY updated_at DESC LIMIT 30`, { operatorId }).catch(() => []);

  const penEvents = await query(`
    SELECT 'PENALTY_ISSUED' AS event_type,
           assessment_ref AS ref, title,
           severity,
           final_fine AS amount, currency,
           COALESCE(issued_at, created_at) AS event_date
      FROM penalty_assessments
     WHERE operator_id = :operatorId AND status <> 'DRAFT'
     ORDER BY COALESCE(issued_at, created_at) DESC LIMIT 30`, { operatorId }).catch(() => []);

  const timeline = [...oblEvents, ...penEvents]
    .filter((e) => e.event_date)
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
    .slice(0, 40);

  return {
    operatorId:   op.operator_id,
    operatorName: op.operator_name,
    score,
    rag: ragFromScore(score),
    obligations: obl,
    kpi,
    penalties: pen,
    obligationList: obligations.map((o) => ({
      ...o,
      progress: o.target_value > 0 && o.current_value != null
        ? Math.min(100, +((o.current_value / o.target_value) * 100).toFixed(1))
        : null,
    })),
    timeline,
  };
}
