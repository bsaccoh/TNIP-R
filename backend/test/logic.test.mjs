// Pure-logic verification (no DB): exercises the real parser + formula evaluator
// against the sample Huawei CSV and the seeded KPI formulas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseHuaweiPmCsv } from '../src/modules/ingestion/huaweiCsvParser.js';
import { parseHuaweiPmResult, parseObjectName, parsePmResultFilename } from '../src/modules/ingestion/huaweiPmResultParser.js';
import { evaluateFormula, validateFormula } from '../src/modules/kpi/formulaEvaluator.js';
import { normalizeRegion, normalizeTech, siteCodeOf, huaweiLcidFromCellName, cellCodeOf } from '../src/modules/inventory/geoDimensionParser.js';

const here = dirname(fileURLToPath(import.meta.url));
const csv = readFileSync(join(here, '../../db/samples/huawei_lte_sample.csv'));

test('parses Huawei PM CSV: detects meta cols and counters', () => {
  const parsed = parseHuaweiPmCsv(csv);
  assert.equal(parsed.records.length, 6);
  assert.equal(parsed.meta.enodebCol, 'eNodeB Name');
  assert.equal(parsed.meta.cellNameCol, 'Cell Name');
  assert.ok(parsed.meta.counterKeys.includes('L.RRC.ConnReq.Att'));
  assert.equal(parsed.meta.counterKeys.length, 14);
  assert.ok(parsed.periodStart && parsed.periodEnd);
});

test('evaluates seeded KPI formulas correctly for row 1', () => {
  const parsed = parseHuaweiPmCsv(csv);
  const r = parsed.records[0]; // FREETOWN_ENB001_C1, 2026-06-01
  const vals = new Map(Object.entries(r.counters));

  const rrc = evaluateFormula('100 * {L.RRC.ConnReq.Succ} / NULLIF({L.RRC.ConnReq.Att},0)', vals);
  assert.ok(Math.abs(rrc - 99.5) < 1e-6, `RRC_SSR=${rrc}`);

  const drop = evaluateFormula('100 * {L.E-RAB.AbnormRel} / NULLIF({L.E-RAB.AbnormRel}+{L.E-RAB.NormRel},0)', vals);
  assert.ok(Math.abs(drop - (100 * 40 / 9740)) < 1e-6, `CALL_DROP=${drop}`);

  const avail = evaluateFormula('100 * {L.Cell.Avail.Dur} / NULLIF({L.Cell.Avail.Dur}+{L.Cell.Unavail.Dur.Sys},0)', vals);
  assert.equal(avail, 100);

  const prb = evaluateFormula('100 * {L.ChMeas.PRB.DL.Used.Avg} / NULLIF({L.ChMeas.PRB.DL.Avail},0)', vals);
  assert.equal(prb, 45);
});

test('formula evaluator handles divide-by-zero via NULLIF → null', () => {
  const vals = new Map([['A', 5], ['B', 0]]);
  assert.equal(evaluateFormula('{A} / NULLIF({B},0)', vals), null);
});

test('missing counter → null (KPI gracefully skipped)', () => {
  const vals = new Map([['A', 5]]);
  assert.equal(evaluateFormula('{A} + {MISSING}', vals), null);
});

test('validateFormula rejects malformed input', () => {
  assert.throws(() => validateFormula('100 * {A} / )'));
  assert.deepEqual(validateFormula('100 * {A}').counterKeys, ['A']);
});

test('parses real Huawei pmresult format (numeric counter IDs + units row)', () => {
  const f = readFileSync(join(here, '../../db/samples/HOST03_pmresult_50331648_60_202606230000_202606230100.csv'));
  const p = parseHuaweiPmResult(f, 'HOST03_pmresult_50331648_60_202606230000_202606230100.csv');
  assert.equal(p.format, 'huawei-pmresult');
  assert.equal(p.measTypeId, '50331648');
  assert.equal(p.granularityMin, 60);
  assert.deepEqual(p.counterIds, ['50331654', '50331655', '50331656']);
  assert.equal(p.units['50331655'], 'bit/s');         // units row consumed, not treated as data
  assert.equal(p.stats.reliable, 2);
  assert.equal(p.stats.unreliable, 1);
  assert.equal(p.stats.skipped, 1);                   // Unreliable row excluded by default
  assert.equal(p.records.length, 2);
  const r = p.records[0];
  assert.equal(r.neName, 'SL0666_NJALA_R');
  assert.equal(r.objectType, 'ULoCell');
  assert.equal(r.localCellId, '11');
  assert.equal(r.cellName, null);                     // "N/A" normalized to null
  assert.equal(r.counters['50331654'], 36038);
});

test('parseObjectName handles cell and RNC-interface forms', () => {
  const cell = parseObjectName('SL0681_BUMBA_R/ULoCell:NodeB Function Name=3G_0681_BUMBA_R, Local Cell ID=11, Cell Name=N/A');
  assert.equal(cell.neName, 'SL0681_BUMBA_R');
  assert.equal(cell.objectType, 'ULoCell');
  assert.equal(cell.attrs['Local Cell ID'], '11');
  const iur = parseObjectName('HW_FTRNC02/IUR:RNCID=10, LogicRNCID=11');
  assert.equal(iur.neName, 'HW_FTRNC02');
  assert.equal(iur.objectType, 'IUR');
  assert.equal(iur.attrs['RNCID'], '10');
});

test('parsePmResultFilename extracts meas-type, granularity, period', () => {
  const m = parsePmResultFilename('HOST03_pmresult_50331648_60_202606230000_202606230100.csv.gz');
  assert.equal(m.measTypeId, '50331648');
  assert.equal(m.granularityMin, 60);
  assert.equal(m.periodStart.toISOString(), '2026-06-23T00:00:00.000Z');
});

test('geo-dimension normalization: regions, tech, site/cell identity', () => {
  assert.equal(normalizeRegion('Western Area '), 'Western Area');   // trailing space
  assert.equal(normalizeRegion('Weatern Area'), 'Western Area');    // typo fix
  assert.deepEqual(normalizeTech('3G_HUAWEI'), { tech: '3G', vendor: 'HUAWEI' });
  assert.deepEqual(normalizeTech('4G'), { tech: '4G', vendor: null });
  assert.equal(siteCodeOf('SL0666_NJALA_R'), 'SL0666');            // PM NE name → site code
  assert.equal(huaweiLcidFromCellName('3G_NAIAHUN_R-11'), '11');   // real LCID in CellName suffix
  assert.equal(huaweiLcidFromCellName('ABERD1'), null);           // no suffix → not PM-resolvable
  // PM ingestion and inventory must derive the SAME cell code for a true match.
  assert.equal(cellCodeOf('SL0696', '3G', '11'), 'SL0696_3G_LC11');
});

test('decompress: gzip .csv.gz expands to the underlying CSV', async () => {
  const zlib = await import('node:zlib');
  const { expandToCsvEntries } = await import('../src/modules/ingestion/decompress.js');
  const csv = Buffer.from('Result Time,Object Name\n2026-06-23 00:00+00:00,SL0001/ULoCell\n');
  const gz = zlib.gzipSync(csv);
  const entries = await expandToCsvEntries('HOST03_pmresult_50331648_60_x_y.csv.gz', gz);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'HOST03_pmresult_50331648_60_x_y.csv');
  assert.ok(entries[0].buffer.toString().includes('SL0001/ULoCell'));
});

test('demo KPI formulas are valid and reference real counter IDs', () => {
  // Mirrors db/seed_demo.sql — guards against formula regressions.
  const v = new Map([['50331710', 994], ['50331724', 1000], ['50341690', 972], ['50341691', 1000], ['50341692', 0.16]]);
  assert.ok(Math.abs(evaluateFormula('100*{50331710}/NULLIF({50331724},0)', v) - 99.4) < 0.01);
  assert.ok(Math.abs(evaluateFormula('100*{50341690}/NULLIF({50341691},0)', v) - 97.2) < 0.01);
  assert.equal(evaluateFormula('{50341692}', v), 0.16);
  assert.deepEqual(validateFormula('100*{50331710}/NULLIF({50331724},0)').counterKeys, ['50331710', '50331724']);
});

test('classify thresholds: PASS / WARNING / FAIL', async () => {
  const { classify } = await import('../src/modules/compliance/compliance.service.js');
  assert.equal(classify(98.5, 'GTE', 98, 1), 'PASS');
  assert.equal(classify(97.5, 'GTE', 98, 1), 'WARNING'); // within 1% margin
  assert.equal(classify(96.0, 'GTE', 98, 1), 'FAIL');
  assert.equal(classify(0.8, 'LTE', 1, 0.3), 'PASS');
  assert.equal(classify(1.2, 'LTE', 1, 0.3), 'WARNING');
  assert.equal(classify(2.0, 'LTE', 1, 0.3), 'FAIL');
});
