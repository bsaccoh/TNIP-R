import { query } from '../../config/db.js';

function linearRegression(points) {
  const n = points.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  points.forEach(({ x, y }) => { sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; });
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export async function getForecast(operatorId, kpiId, horizonDays = 30) {
  const rows = await query(`
    SELECT DATE(ts) AS day, AVG(value) AS avg_value
      FROM calculated_kpis
     WHERE operator_id = :op AND kpi_id = :kpi AND granularity = 'DAY'
       AND ts >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
     GROUP BY DATE(ts)
     ORDER BY day ASC
  `, { op: operatorId, kpi: kpiId });

  if (rows.length < 5) return { historical: rows, forecast: [], insufficient: true };

  const base = new Date(rows[0].day).getTime();
  const points = rows.map((r) => ({
    x: (new Date(r.day).getTime() - base) / 86400000,
    y: r.avg_value,
  }));
  const reg = linearRegression(points);
  if (!reg) return { historical: rows, forecast: [], insufficient: true };

  const lastX = points[points.length - 1].x;
  const forecast = [];
  for (let i = 1; i <= horizonDays; i++) {
    const x = lastX + i;
    const predicted = reg.slope * x + reg.intercept;
    const day = new Date(base + x * 86400000).toISOString().slice(0, 10);
    forecast.push({ day, predicted: Math.round(predicted * 1000) / 1000 });
  }

  // Upsert into forecasts table
  const kpiRow = (await query('SELECT kpi_id FROM kpi_definitions WHERE kpi_id = :id', { id: kpiId }))[0];
  if (kpiRow) {
    await query('DELETE FROM forecasts WHERE operator_id = :op AND kpi_id = :kpi', { op: operatorId, kpi: kpiId });
    for (const f of forecast) {
      await query(
        'INSERT INTO forecasts (operator_id, kpi_id, horizon_ts, predicted, method) VALUES (:op,:kpi,:ts,:pred,"linear")',
        { op: operatorId, kpi: kpiId, ts: f.day, pred: f.predicted });
    }
  }

  return { historical: rows, forecast, slope: reg.slope, intercept: reg.intercept };
}
