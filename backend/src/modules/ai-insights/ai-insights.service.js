import { query } from '../../config/db.js';

export async function listInsights({ domain, severity, status }) {
  return query(
    `SELECT * FROM ai_insights
     WHERE 1=1
       ${domain   ? 'AND domain = :domain' : ''}
       ${severity ? 'AND severity = :severity' : ''}
       ${status   ? 'AND status = :status' : ''}
     ORDER BY FIELD(severity, 'CRITICAL','WARNING','INFO'),
              generated_at DESC
     LIMIT 50`,
    {
      ...(domain   ? { domain } : {}),
      ...(severity ? { severity } : {}),
      ...(status   ? { status } : {}),
    }
  );
}

export async function insightSummary() {
  const bySeverity = await query(
    `SELECT severity, COUNT(*) AS cnt FROM ai_insights
     WHERE status NOT IN ('DISMISSED')
     GROUP BY severity`
  );

  const byDomain = await query(
    `SELECT domain, COUNT(*) AS cnt FROM ai_insights
     WHERE status NOT IN ('DISMISSED')
     GROUP BY domain`
  );

  const byStatus = await query(
    `SELECT status, COUNT(*) AS cnt FROM ai_insights
     GROUP BY status`
  );

  const critical = await query(
    `SELECT * FROM ai_insights
     WHERE severity = 'CRITICAL' AND status NOT IN ('ACTIONED','DISMISSED')
     ORDER BY generated_at DESC LIMIT 5`
  );

  return { bySeverity, byDomain, byStatus, critical };
}

export async function updateInsight(id, { status }) {
  if (!status) return { affected: 0 };
  const result = await query(
    `UPDATE ai_insights SET status = :status WHERE insight_id = :id`,
    { id, status }
  );
  return { affected: result.affectedRows ?? 1 };
}

export async function networkHealthScore() {
  const ran = await query(
    `SELECT ROUND(AVG(CASE WHEN c.status = 'ACTIVE' THEN 100 ELSE 0 END), 1) AS score
     FROM cells c`
  );

  const fiber = await query(
    `SELECT ROUND(SUM(status = 'ACTIVE') / COUNT(*) * 100, 1) AS score
     FROM fiber_links`
  );

  const consumer = await query(
    `SELECT
       ROUND(SUM(status IN ('RESOLVED','CLOSED')) / COUNT(*) * 100, 1) AS resolution_rate,
       COUNT(*) AS total,
       SUM(status IN ('OPEN','INVESTIGATING','ESCALATED')) AS open_cnt
     FROM complaints`
  );

  const compliance = await query(
    `SELECT ROUND(AVG(score), 1) AS score
     FROM compliance_scores
     WHERE period = (SELECT MAX(period) FROM compliance_scores)
       AND domain = 'OVERALL'`
  );

  const activeInsights = await query(
    `SELECT
       SUM(severity = 'CRITICAL' AND status NOT IN ('ACTIONED','DISMISSED')) AS critical,
       SUM(severity = 'WARNING' AND status NOT IN ('ACTIONED','DISMISSED')) AS warnings,
       COUNT(*) AS total
     FROM ai_insights`
  );

  const ranScore = Number(ran[0]?.score) || 0;
  const fiberScore = Number(fiber[0]?.score) || 0;
  const consumerScore = Number(consumer[0]?.resolution_rate) || 0;
  const complianceScore = Number(compliance[0]?.score) || 0;

  const overall = (ranScore * 0.3 + fiberScore * 0.2 + consumerScore * 0.2 + complianceScore * 0.3);

  return {
    overall: Math.round(overall * 10) / 10,
    domains: {
      ran: ranScore,
      fiber: fiberScore,
      consumer: consumerScore,
      compliance: complianceScore,
    },
    complaints: {
      total: Number(consumer[0]?.total) || 0,
      open: Number(consumer[0]?.open_cnt) || 0,
    },
    insights: {
      critical: Number(activeInsights[0]?.critical) || 0,
      warnings: Number(activeInsights[0]?.warnings) || 0,
    },
  };
}
