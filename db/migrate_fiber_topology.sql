SET NAMES utf8mb4;
USE tnipr;

-- ── 1. Add geo columns to fiber_nodes ──────────────────────────────────────
ALTER TABLE fiber_nodes
  ADD COLUMN lat  DECIMAL(9,6) DEFAULT NULL AFTER location,
  ADD COLUMN lng  DECIMAL(9,6) DEFAULT NULL AFTER lat,
  ADD COLUMN city VARCHAR(100) DEFAULT NULL AFTER lng;

-- Extend node_type enum to include HUB and POP
ALTER TABLE fiber_nodes
  MODIFY COLUMN node_type ENUM('OLT','AGGREGATION','CORE','HUB','POP') NOT NULL DEFAULT 'OLT';

-- ── 2. Fiber backbone links table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiber_links (
  link_id          INT          NOT NULL AUTO_INCREMENT,
  node_a_id        INT          NOT NULL,
  node_b_id        INT          NOT NULL,
  operator_id      INT          NOT NULL,
  link_type        ENUM('BACKBONE','METRO','ACCESS','CROSS_CONNECT') NOT NULL DEFAULT 'BACKBONE',
  distance_km      DECIMAL(8,2) DEFAULT NULL,
  capacity_gbps    DECIMAL(8,2) DEFAULT NULL,
  utilization_pct  DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  status           ENUM('ACTIVE','DEGRADED','DOWN') NOT NULL DEFAULT 'ACTIVE',
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (link_id),
  KEY idx_fl_a  (node_a_id),
  KEY idx_fl_b  (node_b_id),
  KEY idx_fl_op (operator_id),
  CONSTRAINT fk_fl_node_a   FOREIGN KEY (node_a_id)   REFERENCES fiber_nodes (node_id),
  CONSTRAINT fk_fl_node_b   FOREIGN KEY (node_b_id)   REFERENCES fiber_nodes (node_id),
  CONSTRAINT fk_fl_operator FOREIGN KEY (operator_id) REFERENCES operators   (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 3. Operator variables ───────────────────────────────────────────────────
SET @st = (SELECT operator_id FROM operators WHERE operator_name LIKE '%SierraTel%' LIMIT 1);
SET @af = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Africell%'  LIMIT 1);
SET @or = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Orange%'    LIMIT 1);
SET @qc = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Qcell%'     LIMIT 1);

-- ── 4. Backbone nodes (geo-tagged CORE/HUB nodes for topology map) ─────────
-- Nodes are slightly offset per operator so they don't overlap on the map.

INSERT INTO fiber_nodes (operator_id, node_name, node_type, location, lat, lng, city, vendor) VALUES
-- ─ SierraTel (national incumbent) ─────────────────────────────────────────
(@st, 'ST-CORE-FTN', 'CORE', 'Freetown IXP',  8.4657, -13.2317, 'Freetown',  'Huawei'),
(@st, 'ST-HUB-WTL',  'HUB',  'Waterloo',       8.3380, -13.0480, 'Waterloo',  'Huawei'),
(@st, 'ST-HUB-PTL',  'HUB',  'Port Loko',      8.8700, -12.8670, 'Port Loko', 'Huawei'),
(@st, 'ST-HUB-LSR',  'HUB',  'Lunsar',         8.6836, -12.5352, 'Lunsar',    'Huawei'),
(@st, 'ST-HUB-MKN',  'HUB',  'Makeni',         8.8770, -12.0430, 'Makeni',    'Huawei'),
(@st, 'ST-HUB-KMB',  'HUB',  'Kambia',         9.1200, -12.9200, 'Kambia',    'Huawei'),
(@st, 'ST-HUB-KBL',  'HUB',  'Kabala',         9.5830, -11.5500, 'Kabala',    'Huawei'),
(@st, 'ST-HUB-MGB',  'HUB',  'Magburaka',      8.7179, -12.0008, 'Magburaka', 'Huawei'),
(@st, 'ST-HUB-BO',   'HUB',  'Bo',             7.9647, -11.7383, 'Bo',        'Huawei'),
(@st, 'ST-HUB-MYB',  'HUB',  'Moyamba',        8.1600, -12.4330, 'Moyamba',   'Huawei'),
(@st, 'ST-HUB-KNM',  'HUB',  'Kenema',         7.8760, -11.1867, 'Kenema',    'Huawei'),
(@st, 'ST-HUB-KLD',  'HUB',  'Koidu',          8.6400, -10.9800, 'Koidu',     'Huawei'),
(@st, 'ST-HUB-KLN',  'HUB',  'Kailahun',       8.2770, -10.5740, 'Kailahun',  'Huawei'),
(@st, 'ST-HUB-PJH',  'HUB',  'Pujehun',        7.3540, -11.7220, 'Pujehun',   'Huawei'),
-- ─ Africell ───────────────────────────────────────────────────────────────
(@af, 'AF-CORE-FTN', 'CORE', 'Freetown Hub',   8.4857, -13.2217, 'Freetown',  'Ericsson'),
(@af, 'AF-HUB-WTL',  'HUB',  'Waterloo',       8.3480, -13.0380, 'Waterloo',  'Ericsson'),
(@af, 'AF-HUB-PTL',  'HUB',  'Port Loko',      8.8600, -12.8770, 'Port Loko', 'Ericsson'),
(@af, 'AF-HUB-MKN',  'HUB',  'Makeni',         8.8870, -12.0330, 'Makeni',    'Ericsson'),
(@af, 'AF-HUB-BO',   'HUB',  'Bo',             7.9747, -11.7283, 'Bo',        'Ericsson'),
(@af, 'AF-HUB-KNM',  'HUB',  'Kenema',         7.8860, -11.1767, 'Kenema',    'Ericsson'),
(@af, 'AF-HUB-KLD',  'HUB',  'Koidu',          8.6500, -10.9700, 'Koidu',     'Ericsson'),
(@af, 'AF-HUB-KLN',  'HUB',  'Kailahun',       8.2870, -10.5640, 'Kailahun',  'Ericsson'),
-- ─ Orange ─────────────────────────────────────────────────────────────────
(@or, 'OR-CORE-FTN', 'CORE', 'Freetown Hub',   8.4557, -13.2417, 'Freetown',  'Nokia'),
(@or, 'OR-HUB-WTL',  'HUB',  'Waterloo',       8.3280, -13.0580, 'Waterloo',  'Nokia'),
(@or, 'OR-HUB-PTL',  'HUB',  'Port Loko',      8.8800, -12.8570, 'Port Loko', 'Nokia'),
(@or, 'OR-HUB-MKN',  'HUB',  'Makeni',         8.8670, -12.0530, 'Makeni',    'Nokia'),
(@or, 'OR-HUB-BO',   'HUB',  'Bo',             7.9547, -11.7483, 'Bo',        'Nokia'),
(@or, 'OR-HUB-KNM',  'HUB',  'Kenema',         7.8660, -11.1967, 'Kenema',    'Nokia'),
-- ─ Qcell ──────────────────────────────────────────────────────────────────
(@qc, 'QC-CORE-FTN', 'CORE', 'Freetown Hub',   8.4757, -13.2117, 'Freetown',  'ZTE'),
(@qc, 'QC-HUB-LNG',  'HUB',  'Lungi',          8.6170, -13.2110, 'Lungi',     'ZTE'),
(@qc, 'QC-HUB-WTL',  'HUB',  'Waterloo',       8.3580, -13.0280, 'Waterloo',  'ZTE'),
(@qc, 'QC-HUB-BO',   'HUB',  'Bo',             7.9847, -11.7183, 'Bo',        'ZTE'),
(@qc, 'QC-HUB-MKN',  'HUB',  'Makeni',         8.8970, -12.0230, 'Makeni',    'ZTE');

-- ── 5. Variables for node IDs ────────────────────────────────────────────────
SET @st_ftn = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-CORE-FTN');
SET @st_wtl = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-WTL');
SET @st_ptl = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-PTL');
SET @st_lsr = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-LSR');
SET @st_mkn = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-MKN');
SET @st_kmb = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-KMB');
SET @st_kbl = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-KBL');
SET @st_mgb = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-MGB');
SET @st_bo  = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-BO');
SET @st_myb = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-MYB');
SET @st_knm = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-KNM');
SET @st_kld = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-KLD');
SET @st_kln = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-KLN');
SET @st_pjh = (SELECT node_id FROM fiber_nodes WHERE node_name = 'ST-HUB-PJH');

SET @af_ftn = (SELECT node_id FROM fiber_nodes WHERE node_name = 'AF-CORE-FTN');
SET @af_wtl = (SELECT node_id FROM fiber_nodes WHERE node_name = 'AF-HUB-WTL');
SET @af_ptl = (SELECT node_id FROM fiber_nodes WHERE node_name = 'AF-HUB-PTL');
SET @af_mkn = (SELECT node_id FROM fiber_nodes WHERE node_name = 'AF-HUB-MKN');
SET @af_bo  = (SELECT node_id FROM fiber_nodes WHERE node_name = 'AF-HUB-BO');
SET @af_knm = (SELECT node_id FROM fiber_nodes WHERE node_name = 'AF-HUB-KNM');
SET @af_kld = (SELECT node_id FROM fiber_nodes WHERE node_name = 'AF-HUB-KLD');
SET @af_kln = (SELECT node_id FROM fiber_nodes WHERE node_name = 'AF-HUB-KLN');

SET @or_ftn = (SELECT node_id FROM fiber_nodes WHERE node_name = 'OR-CORE-FTN');
SET @or_wtl = (SELECT node_id FROM fiber_nodes WHERE node_name = 'OR-HUB-WTL');
SET @or_ptl = (SELECT node_id FROM fiber_nodes WHERE node_name = 'OR-HUB-PTL');
SET @or_mkn = (SELECT node_id FROM fiber_nodes WHERE node_name = 'OR-HUB-MKN');
SET @or_bo  = (SELECT node_id FROM fiber_nodes WHERE node_name = 'OR-HUB-BO');
SET @or_knm = (SELECT node_id FROM fiber_nodes WHERE node_name = 'OR-HUB-KNM');

SET @qc_ftn = (SELECT node_id FROM fiber_nodes WHERE node_name = 'QC-CORE-FTN');
SET @qc_lng = (SELECT node_id FROM fiber_nodes WHERE node_name = 'QC-HUB-LNG');
SET @qc_wtl = (SELECT node_id FROM fiber_nodes WHERE node_name = 'QC-HUB-WTL');
SET @qc_bo  = (SELECT node_id FROM fiber_nodes WHERE node_name = 'QC-HUB-BO');
SET @qc_mkn = (SELECT node_id FROM fiber_nodes WHERE node_name = 'QC-HUB-MKN');

-- ── 6. Backbone links ────────────────────────────────────────────────────────
-- SierraTel national backbone
INSERT INTO fiber_links (node_a_id, node_b_id, operator_id, link_type, distance_km, capacity_gbps, utilization_pct, status) VALUES
-- Western spine
(@st_ftn, @st_wtl, @st, 'BACKBONE', 30.0,  10.0, 44.5, 'ACTIVE'),
(@st_ftn, @st_ptl, @st, 'BACKBONE', 80.0,  10.0, 38.2, 'ACTIVE'),
(@st_ftn, @st_lsr, @st, 'BACKBONE', 75.0,  10.0, 29.8, 'ACTIVE'),
-- Northern corridor
(@st_ptl, @st_mkn, @st, 'BACKBONE', 75.0,  10.0, 52.1, 'ACTIVE'),
(@st_mkn, @st_kmb, @st, 'BACKBONE', 95.0,  2.5,  18.3, 'ACTIVE'),
(@st_mkn, @st_kbl, @st, 'BACKBONE', 120.0, 2.5,  12.7, 'ACTIVE'),
(@st_lsr, @st_mgb, @st, 'BACKBONE', 50.0,  10.0, 35.6, 'ACTIVE'),
(@st_mgb, @st_mkn, @st, 'BACKBONE', 15.0,  10.0, 41.0, 'ACTIVE'),
-- Eastern corridor
(@st_mkn, @st_kld, @st, 'BACKBONE', 140.0, 2.5,  21.4, 'ACTIVE'),
-- Southern corridor
(@st_wtl, @st_bo,  @st, 'BACKBONE', 160.0, 10.0, 67.3, 'ACTIVE'),
(@st_bo,  @st_knm, @st, 'BACKBONE', 65.0,  10.0, 58.9, 'ACTIVE'),
(@st_bo,  @st_myb, @st, 'BACKBONE', 55.0,  2.5,  24.1, 'ACTIVE'),
(@st_bo,  @st_pjh, @st, 'BACKBONE', 110.0, 2.5,  15.8, 'ACTIVE'),
(@st_knm, @st_kln, @st, 'BACKBONE', 80.0,  2.5,  19.2, 'ACTIVE'),
(@st_knm, @st_kld, @st, 'BACKBONE', 80.0,  2.5,  22.7, 'DEGRADED');

-- Africell backbone
INSERT INTO fiber_links (node_a_id, node_b_id, operator_id, link_type, distance_km, capacity_gbps, utilization_pct, status) VALUES
(@af_ftn, @af_wtl, @af, 'BACKBONE', 30.0,  10.0, 51.2, 'ACTIVE'),
(@af_ftn, @af_ptl, @af, 'BACKBONE', 80.0,  10.0, 43.7, 'ACTIVE'),
(@af_wtl, @af_bo,  @af, 'BACKBONE', 160.0, 10.0, 72.4, 'ACTIVE'),
(@af_ptl, @af_mkn, @af, 'BACKBONE', 75.0,  10.0, 47.6, 'ACTIVE'),
(@af_bo,  @af_knm, @af, 'BACKBONE', 65.0,  10.0, 63.1, 'ACTIVE'),
(@af_mkn, @af_kld, @af, 'BACKBONE', 140.0, 2.5,  28.9, 'ACTIVE'),
(@af_knm, @af_kln, @af, 'BACKBONE', 80.0,  2.5,  33.5, 'ACTIVE'),
(@af_kln, @af_kld, @af, 'METRO',    60.0,  1.0,  19.8, 'ACTIVE');

-- Orange backbone
INSERT INTO fiber_links (node_a_id, node_b_id, operator_id, link_type, distance_km, capacity_gbps, utilization_pct, status) VALUES
(@or_ftn, @or_wtl, @or, 'BACKBONE', 30.0,  10.0, 48.3, 'ACTIVE'),
(@or_ftn, @or_ptl, @or, 'BACKBONE', 80.0,  10.0, 39.5, 'ACTIVE'),
(@or_wtl, @or_bo,  @or, 'BACKBONE', 160.0, 10.0, 69.8, 'ACTIVE'),
(@or_ptl, @or_mkn, @or, 'BACKBONE', 75.0,  10.0, 44.2, 'ACTIVE'),
(@or_bo,  @or_knm, @or, 'BACKBONE', 65.0,  10.0, 57.6, 'DEGRADED'),
(@or_mkn, @or_knm, @or, 'BACKBONE', 170.0, 2.5,  31.1, 'ACTIVE');

-- Qcell metro network (western-focused)
INSERT INTO fiber_links (node_a_id, node_b_id, operator_id, link_type, distance_km, capacity_gbps, utilization_pct, status) VALUES
(@qc_ftn, @qc_lng, @qc, 'METRO',    15.0,  10.0, 55.7, 'ACTIVE'),
(@qc_ftn, @qc_wtl, @qc, 'METRO',    30.0,  10.0, 62.4, 'ACTIVE'),
(@qc_wtl, @qc_bo,  @qc, 'BACKBONE', 160.0, 2.5,  38.9, 'ACTIVE'),
(@qc_bo,  @qc_mkn, @qc, 'BACKBONE', 235.0, 2.5,  27.3, 'DOWN');

-- Cross-connects at Freetown IXP (between operators)
INSERT INTO fiber_links (node_a_id, node_b_id, operator_id, link_type, distance_km, capacity_gbps, utilization_pct, status) VALUES
(@st_ftn, @af_ftn, @st, 'CROSS_CONNECT', 0.5, 10.0, 35.2, 'ACTIVE'),
(@st_ftn, @or_ftn, @st, 'CROSS_CONNECT', 0.5, 10.0, 28.7, 'ACTIVE'),
(@st_ftn, @qc_ftn, @st, 'CROSS_CONNECT', 0.5,  1.0, 41.6, 'ACTIVE'),
-- Cross-connects at Bo
(@st_bo,  @af_bo,  @st, 'CROSS_CONNECT', 0.3,  1.0, 22.4, 'ACTIVE'),
(@st_bo,  @or_bo,  @st, 'CROSS_CONNECT', 0.3,  1.0, 19.8, 'ACTIVE'),
-- Cross-connect at Kenema
(@st_knm, @af_knm, @st, 'CROSS_CONNECT', 0.3,  1.0, 17.3, 'ACTIVE'),
-- Cross-connect at Makeni
(@st_mkn, @af_mkn, @st, 'CROSS_CONNECT', 0.3,  1.0, 14.6, 'ACTIVE');
