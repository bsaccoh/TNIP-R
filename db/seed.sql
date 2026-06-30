-- ===========================================================================
-- TNIP-R seed data. Idempotent-ish (INSERT IGNORE / fixed keys).
-- Admin USER is created by the backend on boot (bcrypt) — see ensureSeedAdmin.
-- ===========================================================================
USE tnipr;

-- Roles
INSERT IGNORE INTO roles (role_id, role_key, name, description) VALUES
 (1,'REGULATOR_ADMIN','Regulator Admin','Full platform access'),
 (2,'REGULATOR_ANALYST','Regulator Analyst','Read and report access'),
 (3,'OPERATOR_USER','Operator User','Read-only access to own operator data'),
 (4,'SYSTEM_ADMIN','System Admin','Platform configuration');

-- Permissions (coarse-grained; expand as needed)
INSERT IGNORE INTO permissions (permission_id, perm_key, description) VALUES
 (1,'operators:read','View operators'),
 (2,'operators:write','Manage operators'),
 (3,'ingestion:write','Upload/parse PM files'),
 (4,'kpi:read','View KPIs'),
 (5,'kpi:write','Manage KPI formulas'),
 (6,'compliance:read','View compliance'),
 (7,'compliance:write','Manage thresholds'),
 (8,'users:write','Manage users'),
 (9,'reports:read','View/generate reports'),
 (10,'ai:read','Use AI assistant');

-- Role → permission grants
INSERT IGNORE INTO role_permissions (role_id, permission_id)
 SELECT 1, permission_id FROM permissions;                      -- admin: all
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
 (2,1),(2,4),(2,6),(2,9),(2,10),                                -- analyst: read+reports+ai
 (3,1),(3,4),(3,6),(3,9),(3,10),                                -- operator user (scoped in code)
 (4,1),(4,2),(4,5),(4,7),(4,8);                                 -- system admin: config

-- Vendors / technologies
INSERT IGNORE INTO vendors (vendor_id, vendor_key, name) VALUES
 (1,'HUAWEI','Huawei'),(2,'ERICSSON','Ericsson'),(3,'NOKIA','Nokia'),(4,'ZTE','ZTE');
INSERT IGNORE INTO technologies (technology_id, tech_key, generation, name) VALUES
 (1,'2G','2G','GSM'),(2,'3G','3G','UMTS'),(3,'4G','4G','LTE'),(4,'5G','5G','NR');

-- Operators (Sierra Leone, Phase 1)
INSERT IGNORE INTO operators (operator_id, operator_name, license_number, license_type, status, country, contact_email) VALUES
 (1,'Orange','SL-LIC-001','National Mobile','ACTIVE','Sierra Leone','noc@orange.sl'),
 (2,'Africell','SL-LIC-002','National Mobile','ACTIVE','Sierra Leone','noc@africell.sl'),
 (3,'Qcell','SL-LIC-003','National Mobile','ACTIVE','Sierra Leone','noc@qcell.sl'),
 (4,'SierraTel','SL-LIC-004','National Mobile','ACTIVE','Sierra Leone','noc@sierratel.sl');

-- Regions / districts (subset of Sierra Leone)
INSERT IGNORE INTO regions (region_id, name, code) VALUES
 (1,'Western Area','WA'),(2,'Northern','NO'),(3,'Southern','SO'),(4,'Eastern','EA');
INSERT IGNORE INTO districts (district_id, region_id, name, code) VALUES
 (1,1,'Western Area Urban','WAU'),(2,1,'Western Area Rural','WAR'),
 (3,2,'Bombali','BOM'),(4,3,'Bo','BO'),(5,4,'Kenema','KEN');

-- Counter units
INSERT IGNORE INTO counter_units (unit_id, symbol, name) VALUES
 (1,'count','Count'),(2,'%','Percent'),(3,'kbps','Kilobits/s'),
 (4,'ms','Milliseconds'),(5,'erl','Erlang'),(6,'GB','Gigabytes');

-- Huawei LTE (4G) counter dictionary — the subset the slice KPIs need.
INSERT IGNORE INTO counter_definitions
 (counter_id, vendor_id, technology_id, counter_key, counter_name, unit_id, category, measurement_object, aggregation, status) VALUES
 (1,1,3,'L.RRC.ConnReq.Att','RRC Connection Request Attempts',1,'Accessibility','CELL','SUM','MAPPED'),
 (2,1,3,'L.RRC.ConnReq.Succ','RRC Connection Request Success',1,'Accessibility','CELL','SUM','MAPPED'),
 (3,1,3,'L.E-RAB.AttEst','E-RAB Setup Attempts',1,'Accessibility','CELL','SUM','MAPPED'),
 (4,1,3,'L.E-RAB.SuccEst','E-RAB Setup Success',1,'Accessibility','CELL','SUM','MAPPED'),
 (5,1,3,'L.E-RAB.NormRel','E-RAB Normal Release',1,'Retainability','CELL','SUM','MAPPED'),
 (6,1,3,'L.E-RAB.AbnormRel','E-RAB Abnormal Release',1,'Retainability','CELL','SUM','MAPPED'),
 (7,1,3,'L.Cell.Avail.Dur','Cell Available Duration',4,'Availability','CELL','SUM','MAPPED'),
 (8,1,3,'L.Cell.Unavail.Dur.Sys','Cell Unavailable Duration',4,'Availability','CELL','SUM','MAPPED'),
 (9,1,3,'L.HHO.ExecAttOut','Handover Execution Attempts',1,'Mobility','CELL','SUM','MAPPED'),
 (10,1,3,'L.HHO.ExecSuccOut','Handover Execution Success',1,'Mobility','CELL','SUM','MAPPED'),
 (11,1,3,'L.Thrp.bits.DL','Downlink Throughput Volume (bits)',1,'Quality','CELL','SUM','MAPPED'),
 (12,1,3,'L.Thrp.Time.DL','Downlink Throughput Time (ms)',4,'Quality','CELL','SUM','MAPPED'),
 (13,1,3,'L.Traffic.User.Avg','Average Active Users',1,'Traffic','CELL','AVG','MAPPED'),
 (14,1,3,'L.ChMeas.PRB.DL.Used.Avg','Average DL PRB Used',1,'Capacity','CELL','AVG','MAPPED'),
 (15,1,3,'L.ChMeas.PRB.DL.Avail','DL PRB Available',1,'Capacity','CELL','AVG','MAPPED');

-- KPI definitions
INSERT IGNORE INTO kpi_definitions (kpi_id, kpi_key, name, category, unit, direction, description) VALUES
 (1,'RRC_SSR','RRC Setup Success Rate','Accessibility','%','HIGHER_BETTER','RRC connection setup success ratio'),
 (2,'RAB_SSR','RAB Setup Success Rate','Accessibility','%','HIGHER_BETTER','E-RAB setup success ratio'),
 (3,'CSSR','Call Setup Success Rate','Accessibility','%','HIGHER_BETTER','Composite call setup success'),
 (4,'CALL_DROP_RATE','Call Drop Rate','Retainability','%','LOWER_BETTER','E-RAB abnormal release ratio'),
 (5,'CELL_AVAILABILITY','Cell Availability','Availability','%','HIGHER_BETTER','Cell available time ratio'),
 (6,'HOSR','Handover Success Rate','Mobility','%','HIGHER_BETTER','Outgoing handover success ratio'),
 (7,'DL_THROUGHPUT','DL Throughput','Quality','kbps','HIGHER_BETTER','Average downlink user throughput'),
 (8,'PRB_UTIL','PRB Utilization','Capacity','%','LOWER_BETTER','DL PRB utilization');

-- KPI formulas (global, Huawei/LTE). {COUNTER_KEY} resolved by calc engine.
-- Expressions are safe arithmetic over aggregated counter values.
INSERT IGNORE INTO kpi_formulas (formula_id, kpi_id, vendor_id, technology_id, operator_id, expression, is_active) VALUES
 (1,1,1,3,NULL,'100 * {L.RRC.ConnReq.Succ} / NULLIF({L.RRC.ConnReq.Att},0)',1),
 (2,2,1,3,NULL,'100 * {L.E-RAB.SuccEst} / NULLIF({L.E-RAB.AttEst},0)',1),
 (3,3,1,3,NULL,'100 * ({L.RRC.ConnReq.Succ}/NULLIF({L.RRC.ConnReq.Att},0)) * ({L.E-RAB.SuccEst}/NULLIF({L.E-RAB.AttEst},0))',1),
 (4,4,1,3,NULL,'100 * {L.E-RAB.AbnormRel} / NULLIF({L.E-RAB.AbnormRel}+{L.E-RAB.NormRel},0)',1),
 (5,5,1,3,NULL,'100 * {L.Cell.Avail.Dur} / NULLIF({L.Cell.Avail.Dur}+{L.Cell.Unavail.Dur.Sys},0)',1),
 (6,6,1,3,NULL,'100 * {L.HHO.ExecSuccOut} / NULLIF({L.HHO.ExecAttOut},0)',1),
 (7,7,1,3,NULL,'{L.Thrp.bits.DL} / NULLIF({L.Thrp.Time.DL},0)',1),
 (8,8,1,3,NULL,'100 * {L.ChMeas.PRB.DL.Used.Avg} / NULLIF({L.ChMeas.PRB.DL.Avail},0)',1);

-- QoS thresholds (regulator-defined). comparator + warning_margin drive PASS/WARNING/FAIL.
INSERT IGNORE INTO qos_thresholds
 (threshold_id, kpi_id, technology_id, operator_id, comparator, required_value, warning_margin, effective_from, is_active) VALUES
 (1,3,NULL,NULL,'GTE',98.0,1.0,'2026-01-01',1),     -- CSSR >= 98%, warn within 1%
 (2,4,NULL,NULL,'LTE',1.0,0.3,'2026-01-01',1),      -- Call drop <= 1%
 (3,5,NULL,NULL,'GTE',99.5,0.3,'2026-01-01',1),     -- Availability >= 99.5%
 (4,6,NULL,NULL,'GTE',97.0,1.0,'2026-01-01',1),     -- HOSR >= 97%
 (5,1,NULL,NULL,'GTE',98.5,1.0,'2026-01-01',1),     -- RRC SSR >= 98.5%
 (6,2,NULL,NULL,'GTE',98.0,1.0,'2026-01-01',1),     -- RAB SSR >= 98%
 (7,8,NULL,NULL,'LTE',80.0,5.0,'2026-01-01',1);     -- PRB util <= 80%

-- Ranking configuration + weights (composite QoS score)
INSERT IGNORE INTO ranking_configurations (config_id, name, is_active) VALUES (1,'Default National QoS Score',1);
INSERT IGNORE INTO ranking_weights (weight_id, config_id, kpi_id, weight) VALUES
 (1,1,3,0.30),(2,1,4,0.20),(3,1,5,0.20),(4,1,6,0.15),(5,1,7,0.15);

-- App settings
INSERT IGNORE INTO application_settings (setting_key, value) VALUES
 ('platform_name','TNIP-R'),
 ('regulator_name','National Telecommunications Regulator'),
 ('default_ranking_config','1');
