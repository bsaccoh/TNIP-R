import { schedule } from 'node-cron';
import nodemailer from 'nodemailer';
import { query } from '../config/db.js';
import * as reportsService from '../modules/reports/reports.service.js';
import { markRan, recordRunLog } from '../modules/reports/schedules.service.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

function makeTransporter() {
  const { host, port, user, pass, secure } = env.smtp || {};
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: port || 587,
    secure: secure || false,
    auth: user ? { user, pass } : undefined,
  });
}

export async function executeSchedule(s, triggeredBy = 'AUTO') {
  logger.info(`Running scheduled report: ${s.name} (${s.report_type})`);
  const t0 = Date.now();
  const recipients = (s.recipients || '').split(',').map((r) => r.trim()).filter(Boolean);

  try {
    const opId = s.operator_id || null;
    let rows;
    switch (s.report_type) {
      case 'compliance': rows = await reportsService.generateComplianceReport(opId, null, null); break;
      case 'trend':      rows = await reportsService.generateTrendReport(opId, null, null);      break;
      case 'anomaly':    rows = await reportsService.generateAnomalyReport(opId);                break;
      default:           rows = await reportsService.generateOperatorKpiReport(opId, null, null);
    }

    const buffer = reportsService.buildExcelBuffer(rows, s.report_type.toUpperCase());
    const filename = `TNIP_${s.report_type}_${new Date().toISOString().slice(0,10)}.xlsx`;

    let emailed = false;
    if (recipients.length) {
      const transporter = makeTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: env.smtp?.from || 'TNIP-R Reports <reports@tnipr.gov>',
          to: recipients.join(', '),
          subject: `TNIP-R Automated Report: ${s.name}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px">
              <div style="background:linear-gradient(135deg,#1a237e,#1565c0);padding:24px;border-radius:8px 8px 0 0">
                <h2 style="color:#fff;margin:0">TNIP-R Regulatory Intelligence</h2>
                <p style="color:rgba(255,255,255,.7);margin:4px 0 0">Automated Report Dispatch</p>
              </div>
              <div style="background:#f9fafb;padding:24px;border:1px solid #e0e0e0;border-top:none">
                <p>Please find attached the automated <strong>${s.report_type.toUpperCase()}</strong> report:</p>
                <p style="font-size:18px;font-weight:700;color:#1a237e">${s.name}</p>
                <table style="width:100%;border-collapse:collapse;margin-top:16px">
                  <tr><td style="padding:8px;color:#666;width:140px">Report Type</td><td style="padding:8px;font-weight:600">${s.report_type}</td></tr>
                  <tr style="background:#fff"><td style="padding:8px;color:#666">Generated At</td><td style="padding:8px;font-weight:600">${new Date().toLocaleString()}</td></tr>
                  <tr><td style="padding:8px;color:#666">Records</td><td style="padding:8px;font-weight:600">${rows.length}</td></tr>
                  ${s.operator_name ? `<tr style="background:#fff"><td style="padding:8px;color:#666">Operator</td><td style="padding:8px;font-weight:600">${s.operator_name}</td></tr>` : ''}
                </table>
              </div>
              <div style="padding:16px;font-size:12px;color:#999;text-align:center">
                This is an automated message from TNIP-R. Do not reply.
              </div>
            </div>`,
          attachments: [{
            filename, content: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }],
        });
        logger.info(`Report emailed to: ${recipients.join(', ')}`);
        emailed = true;
      } else {
        logger.warn(`SMTP not configured — skipping email for schedule: ${s.name}`);
      }
    }

    await markRan(s.schedule_id);
    const durationMs = Date.now() - t0;
    await recordRunLog({
      scheduleId: s.schedule_id, triggeredBy, status: 'SUCCESS',
      rowsExported: rows.length, recipients: recipients.join(', '),
      emailed, durationMs,
    });
    logger.info(`Schedule complete: ${s.name} (${durationMs}ms)`);
    return { rows: rows.length, emailed, recipients: recipients.length, durationMs };
  } catch (err) {
    const durationMs = Date.now() - t0;
    await recordRunLog({
      scheduleId: s.schedule_id, triggeredBy, status: 'FAILED',
      recipients: recipients.join(', '), emailed: false,
      errorMessage: err.message, durationMs,
    }).catch(() => {});
    logger.error(`Schedule failed [${s.name}]: ${err.message}`);
    throw err;
  }
}

export async function testSmtp(to) {
  const transporter = makeTransporter();
  if (!transporter) throw new Error('SMTP not configured (SMTP_HOST missing in environment)');
  await transporter.sendMail({
    from: env.smtp?.from || 'TNIP-R Reports <reports@tnipr.gov>',
    to,
    subject: 'TNIP-R SMTP Test',
    html: `<p>SMTP is working correctly. Test sent at <strong>${new Date().toLocaleString()}</strong>.</p>`,
  });
  return { sent: true, to };
}

export function startReportScheduler() {
  schedule('*/5 * * * *', async () => {
    try {
      const due = await query(
        'SELECT * FROM scheduled_reports WHERE is_active = 1 AND next_run_at <= NOW()',
      );
      if (due.length) logger.info(`Report scheduler: ${due.length} due schedule(s)`);
      for (const s of due) {
        await executeSchedule(s).catch(() => {});
      }
    } catch (err) {
      logger.error(`Scheduler tick error: ${err.message}`);
    }
  });
  logger.info('Report scheduler started — checks every 5 minutes');
}
