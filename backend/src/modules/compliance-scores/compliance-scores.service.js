import { query } from '../../config/db.js';

export async function latestScores(operatorId) {
  const latestPeriod = await query(
    `SELECT MAX(period) AS latest FROM compliance_scores`
  );
  const period = latestPeriod[0]?.latest;
  if (!period) return [];
  return query(
    `SELECT cs.*, o.operator_name
       FROM compliance_scores cs
       JOIN operators o ON o.operator_id = cs.operator_id
      WHERE cs.period = :period
        ${operatorId ? 'AND cs.operator_id = :op' : ''}
      ORDER BY o.operator_name, FIELD(cs.domain, 'RAN','FIBER','CORE','CONSUMER','OVERALL')`,
    { period, ...(operatorId ? { op: operatorId } : {}) }
  );
}

export async function scoreTrends(operatorId, domain) {
  return query(
    `SELECT cs.period, cs.score, cs.kpi_pass, cs.kpi_total, cs.domain,
            o.operator_name, o.operator_id
       FROM compliance_scores cs
       JOIN operators o ON o.operator_id = cs.operator_id
      WHERE 1=1
        ${operatorId ? 'AND cs.operator_id = :op' : ''}
        ${domain     ? 'AND cs.domain = :domain' : ''}
      ORDER BY o.operator_name, cs.period`,
    {
      ...(operatorId ? { op: operatorId } : {}),
      ...(domain     ? { domain } : {}),
    }
  );
}

export async function scoreSummary(operatorId) {
  const latestPeriod = await query(
    `SELECT MAX(period) AS latest FROM compliance_scores`
  );
  const period = latestPeriod[0]?.latest;
  if (!period) return { period: null, operators: [] };

  const scores = await query(
    `SELECT cs.*, o.operator_name
       FROM compliance_scores cs
       JOIN operators o ON o.operator_id = cs.operator_id
      WHERE cs.period = :period
        ${operatorId ? 'AND cs.operator_id = :op' : ''}
      ORDER BY o.operator_name, FIELD(cs.domain, 'RAN','FIBER','CORE','CONSUMER','OVERALL')`,
    { period, ...(operatorId ? { op: operatorId } : {}) }
  );

  const opMap = {};
  for (const row of scores) {
    if (!opMap[row.operator_id]) {
      opMap[row.operator_id] = { operator_id: row.operator_id, operator_name: row.operator_name, domains: {} };
    }
    opMap[row.operator_id].domains[row.domain] = {
      score: Number(row.score),
      kpi_pass: row.kpi_pass,
      kpi_total: row.kpi_total,
    };
  }

  return { period: String(period).slice(0, 10), operators: Object.values(opMap) };
}
