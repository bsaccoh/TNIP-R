import { query } from '../../config/db.js';

export async function dataQuality() {
  const [byOperator, recent, gaps] = await Promise.all([
    // Per-operator ingestion summary
    query(`
      SELECT o.operator_id, o.operator_name,
             COUNT(j.job_id) AS total_jobs,
             SUM(j.status = 'DONE')      AS done,
             SUM(j.status = 'FAILED')    AS failed,
             SUM(j.status = 'DUPLICATE') AS duplicate,
             SUM(j.status = 'RUNNING')   AS running,
             SUM(j.status = 'PENDING')   AS pending,
             ROUND(100.0 * SUM(j.status = 'DONE') / NULLIF(COUNT(j.job_id),0), 1) AS success_rate,
             MAX(j.finished_at) AS last_ingestion
        FROM operators o
        LEFT JOIN ingestion_jobs j ON j.operator_id = o.operator_id
       GROUP BY o.operator_id, o.operator_name
       ORDER BY success_rate ASC
    `),
    // Daily ingestion count last 30 days
    query(`
      SELECT DATE(created_at) AS day,
             COUNT(*) AS total,
             SUM(status = 'DONE') AS done,
             SUM(status = 'FAILED') AS failed
        FROM ingestion_jobs
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day ASC
    `),
    // Operators with no ingestion in last 7 days
    query(`
      SELECT o.operator_id, o.operator_name,
             MAX(j.created_at) AS last_seen,
             DATEDIFF(CURDATE(), MAX(j.created_at)) AS days_silent
        FROM operators o
        LEFT JOIN ingestion_jobs j ON j.operator_id = o.operator_id AND j.status = 'DONE'
       WHERE o.status = 'ACTIVE'
       GROUP BY o.operator_id, o.operator_name
      HAVING last_seen IS NULL OR days_silent > 7
       ORDER BY days_silent DESC
    `),
  ]);

  return { byOperator, recent, gaps };
}
