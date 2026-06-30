import PDFDocument from 'pdfkit';
import { query } from '../../config/db.js';

const BRAND  = '#1565C0';
const LIGHT  = '#E3F2FD';
const DANGER = '#C62828';

function drawTableHeader(doc, cols, colW, x, y) {
  const W = colW.reduce((a, b) => a + b, 0);
  doc.rect(x, y, W, 18).fill(BRAND);
  let cx = x;
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
  cols.forEach((col, i) => {
    doc.text(col, cx + 4, y + 5, { width: colW[i] - 8, lineBreak: false });
    cx += colW[i];
  });
  return y + 18;
}

function drawTableRow(doc, cells, colW, x, y, bg) {
  const W = colW.reduce((a, b) => a + b, 0);
  doc.rect(x, y, W, 18).fill(bg).stroke('#E0E0E0');
  let cx = x;
  doc.fillColor('#111111').fontSize(8).font('Helvetica');
  cells.forEach((cell, i) => {
    const isLast = i === cells.length - 1;
    if (isLast) doc.fillColor(DANGER);
    doc.text(String(cell ?? '—'), cx + 4, y + 5, { width: colW[i] - 8, lineBreak: false });
    if (isLast) doc.fillColor('#111111');
    cx += colW[i];
  });
  return y + 18;
}

export async function generateNoticePdf(noticeId) {
  const [notice] = await query(
    `SELECT n.*, o.operator_name FROM compliance_notices n
     JOIN operators o ON o.operator_id = n.operator_id WHERE n.notice_id = :noticeId`,
    { noticeId },
  );
  if (!notice) throw new Error('Notice not found');

  const breaches = typeof notice.breaches === 'string'
    ? JSON.parse(notice.breaches || '[]')
    : notice.breaches || [];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
      Title: `Compliance Notice ${notice.notice_ref}`,
      Author: 'TNIP-R Regulatory Intelligence Platform',
    } });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), ref: notice.notice_ref }));
    doc.on('error', reject);

    const PW = doc.page.width;
    const L  = 50;
    const W  = PW - 100;

    // ── Header bar ───────────────────────────────────────────
    doc.rect(0, 0, PW, 80).fill(BRAND);
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('TNIP-R', L, 16);
    doc.fontSize(10).font('Helvetica')
      .text('Telecommunications National Intelligence Platform — Regulatory', L, 40);
    doc.fontSize(13).font('Helvetica-Bold').text('COMPLIANCE NOTICE', L, 58);

    // ── Notice metadata ───────────────────────────────────────
    let y = 100;
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text('Notice Details', L, y);
    y += 16;

    const meta = [
      ['Reference',  notice.notice_ref],
      ['Operator',   notice.operator_name],
      ['Period',     notice.period || '—'],
      ['Issued',     new Date(notice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })],
      ['Status',     notice.status],
    ];

    for (const [label, value] of meta) {
      doc.rect(L, y, 130, 18).fill(LIGHT);
      doc.rect(L + 130, y, W - 130, 18).fill('#FFFFFF').stroke('#D0D0D0');
      doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold')
        .text(label, L + 4, y + 5, { width: 122, lineBreak: false });
      doc.fillColor('#000000').font('Helvetica')
        .text(String(value || '—'), L + 136, y + 5, { width: W - 140, lineBreak: false });
      y += 19;
    }

    y += 14;

    // ── Divider ───────────────────────────────────────────────
    doc.rect(L, y, W, 1).fill('#CCCCCC');
    y += 10;

    // ── Regulatory statement ──────────────────────────────────
    doc.fillColor('#444444').fontSize(9).font('Helvetica-Oblique').text(
      'This notice is issued by the Telecommunications National Intelligence Platform (TNIP-R) ' +
      'pursuant to the national Quality of Service (QoS) regulatory framework. The operator is ' +
      'required to remediate the listed KPI breaches within 30 days of receipt. Failure to ' +
      'remediate may result in regulatory sanctions in accordance with applicable telecommunications regulations.',
      L, y, { width: W, align: 'justify' },
    );
    y += 56;

    // ── Breaches table ────────────────────────────────────────
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
      .text(`KPI Breaches — ${breaches.length} breach${breaches.length !== 1 ? 'es' : ''} found`, L, y);
    y += 16;

    if (!breaches.length) {
      doc.fontSize(9).font('Helvetica').fillColor('#777777')
        .text('No active KPI breaches at time of issuance.', L, y);
    } else {
      const cols = ['KPI Key', 'KPI Name', 'Unit', 'Measured', 'Required', 'Status'];
      const colW = [90, 155, 38, 65, 65, 47];

      y = drawTableHeader(doc, cols, colW, L, y);

      breaches.forEach((b, idx) => {
        if (y > doc.page.height - 80) { doc.addPage(); y = 50; }
        const cells = [
          b.kpi_key,
          b.kpi_name,
          b.unit || '—',
          Number(b.value ?? 0).toFixed(2),
          `${b.comparator} ${b.required_value}`,
          'FAIL',
        ];
        y = drawTableRow(doc, cells, colW, L, y, idx % 2 === 0 ? '#F5F5F5' : '#FFFFFF');
      });
    }

    // ── Footer ────────────────────────────────────────────────
    const FY = doc.page.height - 45;
    doc.rect(0, FY, PW, 45).fill('#F0F4F8');
    doc.fillColor('#666666').fontSize(8).font('Helvetica').text(
      `Generated by TNIP-R on ${new Date().toLocaleString()}  ·  Reference: ${notice.notice_ref}`,
      L, FY + 16, { width: W, align: 'center', lineBreak: false },
    );

    doc.end();
  });
}
