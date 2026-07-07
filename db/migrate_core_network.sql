SET NAMES utf8mb4;
USE tnipr;

-- ── Core network elements ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core_elements (
  element_id   INT          NOT NULL AUTO_INCREMENT,
  operator_id  INT          NOT NULL,
  element_name VARCHAR(100) NOT NULL,
  element_type ENUM('MSC','MGW','HLR','HSS','GGSN','PGW','SGW','MME','PCRF','SBC','SMSC','DNS') NOT NULL,
  vendor       VARCHAR(60)  DEFAULT NULL,
  version      VARCHAR(60)  DEFAULT NULL,
  location     VARCHAR(100) DEFAULT NULL,
  city         VARCHAR(80)  DEFAULT NULL,
  capacity     VARCHAR(60)  DEFAULT NULL,
  status       ENUM('ACTIVE','DEGRADED','DOWN','MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
  cpu_pct      DECIMAL(5,2) DEFAULT NULL,
  memory_pct   DECIMAL(5,2) DEFAULT NULL,
  sessions     INT          DEFAULT NULL,
  max_sessions INT          DEFAULT NULL,
  uptime_days  INT          DEFAULT NULL,
  last_poll    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (element_id),
  KEY idx_ce_operator (operator_id),
  KEY idx_ce_type (element_type),
  CONSTRAINT fk_ce_operator FOREIGN KEY (operator_id) REFERENCES operators (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Core network KPIs (time-series) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core_kpis (
  kpi_id       INT          NOT NULL AUTO_INCREMENT,
  operator_id  INT          NOT NULL,
  element_id   INT          DEFAULT NULL,
  kpi_name     VARCHAR(80)  NOT NULL,
  kpi_key      VARCHAR(50)  NOT NULL,
  value        DECIMAL(12,4) NOT NULL,
  unit         VARCHAR(20)  DEFAULT NULL,
  ts           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (kpi_id),
  KEY idx_ck_operator (operator_id),
  KEY idx_ck_key (kpi_key),
  KEY idx_ck_ts (ts),
  CONSTRAINT fk_ck_operator FOREIGN KEY (operator_id) REFERENCES operators (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Core alarms / incidents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core_alarms (
  alarm_id     INT          NOT NULL AUTO_INCREMENT,
  operator_id  INT          NOT NULL,
  element_id   INT          DEFAULT NULL,
  severity     ENUM('CRITICAL','MAJOR','MINOR','WARNING','INFO') NOT NULL DEFAULT 'WARNING',
  status       ENUM('ACTIVE','ACKNOWLEDGED','CLEARED') NOT NULL DEFAULT 'ACTIVE',
  alarm_type   VARCHAR(100) NOT NULL,
  description  TEXT         DEFAULT NULL,
  raised_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cleared_at   DATETIME     DEFAULT NULL,
  PRIMARY KEY (alarm_id),
  KEY idx_ca_operator (operator_id),
  KEY idx_ca_status (status),
  CONSTRAINT fk_ca_operator FOREIGN KEY (operator_id) REFERENCES operators (operator_id),
  CONSTRAINT fk_ca_element FOREIGN KEY (element_id) REFERENCES core_elements (element_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Seed operators ─────────────────────────────────────────────────────────
SET @af = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Africell%'  LIMIT 1);
SET @or = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Orange%'    LIMIT 1);
SET @st = (SELECT operator_id FROM operators WHERE operator_name LIKE '%SierraTel%' LIMIT 1);
SET @qc = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Qcell%'     LIMIT 1);

-- ── Seed core elements ─────────────────────────────────────────────────────
INSERT INTO core_elements (operator_id, element_name, element_type, vendor, version, location, city, capacity, status, cpu_pct, memory_pct, sessions, max_sessions, uptime_days) VALUES
-- Africell
(@af, 'AF-MSC-01',   'MSC',  'Ericsson', 'MSS 18.2', 'Freetown DC', 'Freetown', '500k subs',  'ACTIVE',      42.5, 58.3, 12500, 50000, 180),
(@af, 'AF-MGW-01',   'MGW',  'Ericsson', 'MGW 16.1', 'Freetown DC', 'Freetown', '2000 E1',    'ACTIVE',      35.2, 45.1, 1850, 4000, 180),
(@af, 'AF-HSS-01',   'HSS',  'Ericsson', 'HSS 14.0', 'Freetown DC', 'Freetown', '2M subs',    'ACTIVE',      28.7, 62.4, NULL, NULL, 365),
(@af, 'AF-PGW-01',   'PGW',  'Huawei',   'UGW 9811', 'Freetown DC', 'Freetown', '100 Gbps',   'ACTIVE',      55.8, 71.2, 45000, 80000, 90),
(@af, 'AF-MME-01',   'MME',  'Ericsson', 'SGSN-MME', 'Freetown DC', 'Freetown', '200k attach','ACTIVE',      48.3, 55.7, 85000, 200000, 90),
(@af, 'AF-PCRF-01',  'PCRF', 'Oracle',   'PCRF 12.5','Freetown DC', 'Freetown', '100k rules', 'ACTIVE',      22.1, 38.5, NULL, NULL, 270),
(@af, 'AF-SMSC-01',  'SMSC', 'Huawei',   'iSMS 3.0', 'Freetown DC', 'Freetown', '500 TPS',    'ACTIVE',      18.5, 32.0, NULL, NULL, 365),
-- Orange
(@or, 'OR-MSC-01',   'MSC',  'Nokia',    'CS Core 21','Freetown DC','Freetown', '400k subs',  'ACTIVE',      38.9, 52.6, 10200, 40000, 220),
(@or, 'OR-HLR-01',   'HLR',  'Nokia',    'HLR 9.2',  'Freetown DC','Freetown', '1.5M subs',  'ACTIVE',      31.4, 48.9, NULL, NULL, 400),
(@or, 'OR-PGW-01',   'PGW',  'Nokia',    'FGW 21.6', 'Freetown DC','Freetown', '80 Gbps',    'DEGRADED',    72.5, 82.3, 38000, 60000, 45),
(@or, 'OR-MME-01',   'MME',  'Nokia',    'MME 20.1', 'Freetown DC','Freetown', '150k attach','ACTIVE',      44.1, 50.8, 62000, 150000, 120),
(@or, 'OR-SGW-01',   'SGW',  'Nokia',    'SGW 20.1', 'Freetown DC','Freetown', '60 Gbps',    'ACTIVE',      40.2, 55.3, 62000, 150000, 120),
(@or, 'OR-SMSC-01',  'SMSC', 'Nokia',    'SMSC 8.0', 'Freetown DC','Freetown', '300 TPS',    'ACTIVE',      15.8, 28.4, NULL, NULL, 500),
-- SierraTel
(@st, 'ST-MSC-01',   'MSC',  'ZTE',      'ZXSS10 B2','Freetown DC','Freetown', '300k subs',  'ACTIVE',      58.3, 68.7, 8500, 30000, 90),
(@st, 'ST-HLR-01',   'HLR',  'ZTE',      'ZXSS10 H', 'Freetown DC','Freetown', '800k subs',  'ACTIVE',      45.2, 55.1, NULL, NULL, 300),
(@st, 'ST-GGSN-01',  'GGSN', 'ZTE',      'ZXUN 9000','Freetown DC','Freetown', '40 Gbps',    'ACTIVE',      62.1, 74.5, 15000, 30000, 60),
(@st, 'ST-MGW-01',   'MGW',  'ZTE',      'ZXSS10 M', 'Freetown DC','Freetown', '1000 E1',    'DEGRADED',    78.5, 85.2, 950, 2000, 30),
(@st, 'ST-SMSC-01',  'SMSC', 'ZTE',      'ZXMP M721','Freetown DC','Freetown', '200 TPS',    'ACTIVE',      25.3, 40.1, NULL, NULL, 200),
-- Qcell
(@qc, 'QC-MSC-01',   'MSC',  'Huawei',   'MSC 6900', 'Freetown DC','Freetown', '250k subs',  'ACTIVE',      35.8, 48.2, 6800, 25000, 150),
(@qc, 'QC-HSS-01',   'HSS',  'Huawei',   'HSS 9860', 'Freetown DC','Freetown', '1M subs',    'ACTIVE',      22.5, 40.8, NULL, NULL, 300),
(@qc, 'QC-PGW-01',   'PGW',  'Huawei',   'UGW 9811', 'Freetown DC','Freetown', '50 Gbps',    'ACTIVE',      48.2, 60.1, 22000, 50000, 120),
(@qc, 'QC-MME-01',   'MME',  'Huawei',   'MME 6900', 'Freetown DC','Freetown', '100k attach','DOWN',        0.0, 0.0, 0, 100000, 0),
(@qc, 'QC-SBC-01',   'SBC',  'AudioCodes','SBC 4000','Freetown DC','Freetown', '5000 sess',  'ACTIVE',      30.1, 42.5, 2200, 5000, 250);

-- ── Seed core KPIs (latest day) ────────────────────────────────────────────
INSERT INTO core_kpis (operator_id, kpi_name, kpi_key, value, unit, ts) VALUES
-- Africell
(@af, 'Call Setup Success Rate',   'cssr',         99.2, '%',    '2026-07-07 06:00:00'),
(@af, 'Location Update Success',   'lu_success',   98.8, '%',    '2026-07-07 06:00:00'),
(@af, 'PDP Context Success Rate',  'pdp_success',  99.5, '%',    '2026-07-07 06:00:00'),
(@af, 'Attach Success Rate',       'attach_sr',    99.1, '%',    '2026-07-07 06:00:00'),
(@af, 'Paging Success Rate',       'paging_sr',    97.5, '%',    '2026-07-07 06:00:00'),
(@af, 'Average Latency',           'avg_latency',  25.3, 'ms',   '2026-07-07 06:00:00'),
(@af, 'Signaling Load',            'sig_load',     42.5, '%',    '2026-07-07 06:00:00'),
(@af, 'Data Throughput',            'throughput',   85.2, 'Gbps', '2026-07-07 06:00:00'),
-- Orange
(@or, 'Call Setup Success Rate',   'cssr',         98.5, '%',    '2026-07-07 06:00:00'),
(@or, 'Location Update Success',   'lu_success',   97.9, '%',    '2026-07-07 06:00:00'),
(@or, 'PDP Context Success Rate',  'pdp_success',  98.8, '%',    '2026-07-07 06:00:00'),
(@or, 'Attach Success Rate',       'attach_sr',    98.2, '%',    '2026-07-07 06:00:00'),
(@or, 'Paging Success Rate',       'paging_sr',    96.8, '%',    '2026-07-07 06:00:00'),
(@or, 'Average Latency',           'avg_latency',  32.1, 'ms',   '2026-07-07 06:00:00'),
(@or, 'Signaling Load',            'sig_load',     55.8, '%',    '2026-07-07 06:00:00'),
(@or, 'Data Throughput',            'throughput',   62.4, 'Gbps', '2026-07-07 06:00:00'),
-- SierraTel
(@st, 'Call Setup Success Rate',   'cssr',         96.2, '%',    '2026-07-07 06:00:00'),
(@st, 'Location Update Success',   'lu_success',   95.5, '%',    '2026-07-07 06:00:00'),
(@st, 'PDP Context Success Rate',  'pdp_success',  97.1, '%',    '2026-07-07 06:00:00'),
(@st, 'Attach Success Rate',       'attach_sr',    96.8, '%',    '2026-07-07 06:00:00'),
(@st, 'Paging Success Rate',       'paging_sr',    94.2, '%',    '2026-07-07 06:00:00'),
(@st, 'Average Latency',           'avg_latency',  48.7, 'ms',   '2026-07-07 06:00:00'),
(@st, 'Signaling Load',            'sig_load',     68.3, '%',    '2026-07-07 06:00:00'),
(@st, 'Data Throughput',            'throughput',   35.8, 'Gbps', '2026-07-07 06:00:00'),
-- Qcell
(@qc, 'Call Setup Success Rate',   'cssr',         97.8, '%',    '2026-07-07 06:00:00'),
(@qc, 'Location Update Success',   'lu_success',   97.2, '%',    '2026-07-07 06:00:00'),
(@qc, 'PDP Context Success Rate',  'pdp_success',  98.5, '%',    '2026-07-07 06:00:00'),
(@qc, 'Attach Success Rate',       'attach_sr',    97.5, '%',    '2026-07-07 06:00:00'),
(@qc, 'Paging Success Rate',       'paging_sr',    96.0, '%',    '2026-07-07 06:00:00'),
(@qc, 'Average Latency',           'avg_latency',  35.5, 'ms',   '2026-07-07 06:00:00'),
(@qc, 'Signaling Load',            'sig_load',     48.2, '%',    '2026-07-07 06:00:00'),
(@qc, 'Data Throughput',            'throughput',   42.1, 'Gbps', '2026-07-07 06:00:00');

-- ── Seed core alarms ───────────────────────────────────────────────────────
INSERT INTO core_alarms (operator_id, element_id, severity, status, alarm_type, description, raised_at) VALUES
(@or, (SELECT element_id FROM core_elements WHERE element_name='OR-PGW-01'), 'MAJOR', 'ACTIVE',
 'High CPU Utilization', 'PGW CPU at 72.5% — exceeding 70% threshold. Data session performance may be affected.', '2026-07-07 02:15:00'),
(@or, (SELECT element_id FROM core_elements WHERE element_name='OR-PGW-01'), 'MAJOR', 'ACTIVE',
 'High Memory Utilization', 'PGW memory at 82.3% — approaching critical threshold of 85%.', '2026-07-07 02:15:00'),
(@st, (SELECT element_id FROM core_elements WHERE element_name='ST-MGW-01'), 'CRITICAL', 'ACTIVE',
 'Gateway Overload', 'MGW at 78.5% CPU and 85.2% memory. Voice call capacity severely limited.', '2026-07-06 18:30:00'),
(@st, (SELECT element_id FROM core_elements WHERE element_name='ST-GGSN-01'), 'MAJOR', 'ACKNOWLEDGED',
 'High Session Count', 'GGSN at 50% session capacity (15000/30000). Growth trend may hit limit within 48h.', '2026-07-06 12:00:00'),
(@qc, (SELECT element_id FROM core_elements WHERE element_name='QC-MME-01'), 'CRITICAL', 'ACTIVE',
 'Element Down', 'MME is unresponsive. All LTE attach/detach operations failing. Subscribers falling back to 3G.', '2026-07-07 03:45:00'),
(@af, (SELECT element_id FROM core_elements WHERE element_name='AF-PGW-01'), 'WARNING', 'ACTIVE',
 'Session Threshold Warning', 'PGW sessions at 56% capacity (45000/80000). Normal for peak hours.', '2026-07-07 08:00:00'),
(@af, (SELECT element_id FROM core_elements WHERE element_name='AF-MSC-01'), 'INFO', 'CLEARED',
 'Planned Maintenance Complete', 'MSC software upgrade completed successfully. All services nominal.', '2026-07-06 04:00:00');
