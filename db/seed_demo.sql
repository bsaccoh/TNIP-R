-- ===========================================================================
-- TNIP-R DEMO seed — 3G/UMTS counter dictionary + KPIs for the real Orange
-- pmresult measurement type 50331648 (file: HOST03_pmresult_50331648_*).
--
--   ⚠️  DEMO / NON-AUTHORITATIVE.  The counter ID→name mappings below are
--   ILLUSTRATIVE so the end-to-end pipeline (parse → KPI → compliance →
--   ranking) can be exercised on REAL data. They are NOT the official Huawei
--   counter meanings. Replace via POST /api/v1/counters/import once the real
--   U2020 counter reference is available. Do not use for actual compliance.
--
-- Counter pairs were chosen from observed value distributions so KPIs land in
-- believable ranges (see README "Phase 1 data reality"). Uses high explicit IDs
-- (200+/100+) to avoid colliding with the LTE demo in seed.sql.
-- ===========================================================================
USE tnipr;

-- DEMO 3G counter dictionary (vendor Huawei=1, technology 3G=2), MAPPED.
-- These 5 IDs were chosen because their value relationships are well-behaved
-- PER CELL on the real file (success ⊆ attempt in ~100% of cells), so the demo
-- KPIs land in believable ranges. Names remain illustrative, not authoritative.
INSERT INTO counter_definitions
  (counter_id, vendor_id, technology_id, counter_key, counter_name, meas_type_id, category, measurement_object, aggregation, status, description) VALUES
 (201,1,2,'50331710','DEMO.RRC.SuccConnEstab','50331648','Accessibility','ULOCELL','SUM','MAPPED','DEMO mapping — not authoritative'),
 (202,1,2,'50331724','DEMO.RRC.AttConnEstab','50331648','Accessibility','ULOCELL','SUM','MAPPED','DEMO mapping — not authoritative'),
 (203,1,2,'50341690','DEMO.RAB.SuccEstab','50331648','Accessibility','ULOCELL','SUM','MAPPED','DEMO mapping — not authoritative'),
 (204,1,2,'50341691','DEMO.RAB.AttEstab','50331648','Accessibility','ULOCELL','SUM','MAPPED','DEMO mapping — not authoritative'),
 (206,1,2,'50341692','DEMO.Cell.DropRate.Pct','50331648','Retainability','ULOCELL','AVG','MAPPED','DEMO mapping — not authoritative');

-- DEMO 3G KPI definitions
INSERT INTO kpi_definitions (kpi_id, kpi_key, name, category, unit, direction, description) VALUES
 (101,'DEMO_RRC_SR_3G','3G RRC Setup Success Rate (DEMO)','Accessibility','%','HIGHER_BETTER','DEMO 3G KPI'),
 (102,'DEMO_RAB_SR_3G','3G RAB Setup Success Rate (DEMO)','Accessibility','%','HIGHER_BETTER','DEMO 3G KPI'),
 (103,'DEMO_CSSR_3G','3G Call Setup Success Rate (DEMO)','Accessibility','%','HIGHER_BETTER','DEMO 3G KPI'),
 (104,'DEMO_DCR_3G','3G Call Drop Rate (DEMO)','Retainability','%','LOWER_BETTER','DEMO 3G KPI'),
 (105,'DEMO_HOSR_3G','3G Handover Success Rate (DEMO)','Mobility','%','HIGHER_BETTER','DEMO 3G KPI'),
 (106,'DEMO_AVAIL_3G','3G Service Availability (DEMO)','Availability','%','HIGHER_BETTER','DEMO 3G KPI');

-- DEMO 3G formulas (vendor Huawei=1, technology 3G=2, global). Verified to
-- compute valid per-cell values on the real file (HOST03_pmresult_50331648).
INSERT INTO kpi_formulas (formula_id, kpi_id, vendor_id, technology_id, operator_id, expression, is_active) VALUES
 (101,101,1,2,NULL,'100 * {50331710} / NULLIF({50331724},0)',1),
 (102,102,1,2,NULL,'100 * {50341690} / NULLIF({50341691},0)',1),
 (103,103,1,2,NULL,'100 * ({50331710}/NULLIF({50331724},0)) * ({50341690}/NULLIF({50341691},0))',1),
 (104,104,1,2,NULL,'{50341692}',1),
 (105,105,1,2,NULL,'100 * {50331710} / NULLIF({50331724},0)',1),
 (106,106,1,2,NULL,'100 * {50341690} / NULLIF({50341691},0)',1);

-- DEMO 3G thresholds (technology 3G=2) — tuned to the verified per-cell averages
-- to demonstrate a PASS/WARNING/FAIL mix on the real Orange data.
INSERT INTO qos_thresholds
 (threshold_id, kpi_id, technology_id, operator_id, comparator, required_value, warning_margin, effective_from, is_active) VALUES
 (101,101,2,NULL,'GTE',98.0,1.0,'2026-01-01',1),    -- RRC SR ~99.38 → PASS
 (102,102,2,NULL,'GTE',97.0,1.0,'2026-01-01',1),    -- RAB SR ~97.20 → PASS
 (103,103,2,NULL,'GTE',98.0,1.0,'2026-01-01',1),    -- CSSR ~96.57 → FAIL
 (104,104,2,NULL,'LTE',1.0,0.3,'2026-01-01',1),     -- Drop ~0.16  → PASS
 (105,105,2,NULL,'GTE',99.5,0.5,'2026-01-01',1),    -- HOSR ~99.38 → WARNING
 (106,106,2,NULL,'GTE',95.0,1.0,'2026-01-01',1);    -- Avail ~97.20 → PASS

-- DEMO ranking weights for the 3G composite score
INSERT INTO ranking_configurations (config_id, name, is_active) VALUES (2,'DEMO 3G QoS Score',1)
  ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO ranking_weights (weight_id, config_id, kpi_id, weight) VALUES
 (101,2,103,0.30),(102,2,104,0.20),(103,2,106,0.20),(104,2,105,0.15),(105,2,102,0.15);
