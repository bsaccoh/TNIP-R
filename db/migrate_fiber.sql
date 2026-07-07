SET NAMES utf8mb4;
USE tnipr;

-- ── Fiber nodes (OLTs, aggregation switches, core routers) ──────────────────
CREATE TABLE IF NOT EXISTS fiber_nodes (
  node_id     INT            NOT NULL AUTO_INCREMENT,
  operator_id INT            NOT NULL,
  node_name   VARCHAR(100)   NOT NULL,
  node_type   ENUM('OLT','AGGREGATION','CORE') NOT NULL DEFAULT 'OLT',
  location    VARCHAR(200)   DEFAULT NULL,
  vendor      VARCHAR(50)    DEFAULT NULL,
  is_active   TINYINT(1)     NOT NULL DEFAULT 1,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (node_id),
  KEY idx_fn_operator (operator_id),
  CONSTRAINT fk_fn_operator FOREIGN KEY (operator_id) REFERENCES operators (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Fiber PM upload log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiber_pm_files (
  file_id      INT          NOT NULL AUTO_INCREMENT,
  operator_id  INT          NOT NULL,
  filename     VARCHAR(255) NOT NULL,
  period_start DATE         DEFAULT NULL,
  period_end   DATE         DEFAULT NULL,
  row_count    INT          NOT NULL DEFAULT 0,
  status       ENUM('PENDING','PROCESSING','CALCULATED','ERROR') NOT NULL DEFAULT 'PENDING',
  uploaded_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (file_id),
  CONSTRAINT fk_fpf_operator FOREIGN KEY (operator_id) REFERENCES operators (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Fiber KPI definitions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiber_kpi_definitions (
  kpi_id      INT          NOT NULL AUTO_INCREMENT,
  kpi_key     VARCHAR(100) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  unit        VARCHAR(20)  NOT NULL DEFAULT '%',
  category    VARCHAR(100) DEFAULT NULL,
  description TEXT         DEFAULT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (kpi_id),
  UNIQUE KEY uq_fkd_key (kpi_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Fiber calculated KPIs (daily operator-level aggregates) ─────────────────
CREATE TABLE IF NOT EXISTS fiber_calculated_kpis (
  calc_id     BIGINT    NOT NULL AUTO_INCREMENT,
  operator_id INT       NOT NULL,
  node_id     INT       DEFAULT NULL,
  kpi_id      INT       NOT NULL,
  ts          DATETIME  NOT NULL,
  granularity ENUM('DAY','WEEK','MONTH') NOT NULL DEFAULT 'DAY',
  value       DOUBLE    DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (calc_id),
  KEY idx_fck_lookup (operator_id, kpi_id, granularity, ts),
  CONSTRAINT fk_fck_operator FOREIGN KEY (operator_id) REFERENCES operators (operator_id),
  CONSTRAINT fk_fck_kpi      FOREIGN KEY (kpi_id)      REFERENCES fiber_kpi_definitions (kpi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Fiber QoS thresholds ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiber_qos_thresholds (
  threshold_id   INT            NOT NULL AUTO_INCREMENT,
  kpi_id         INT            NOT NULL,
  required_value DECIMAL(12,4)  NOT NULL,
  comparator     ENUM('>=','>','<=','<','=') NOT NULL DEFAULT '>=',
  is_active      TINYINT(1)     NOT NULL DEFAULT 1,
  PRIMARY KEY (threshold_id),
  CONSTRAINT fk_fqt_kpi FOREIGN KEY (kpi_id) REFERENCES fiber_kpi_definitions (kpi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Seed KPI definitions ────────────────────────────────────────────────────
INSERT IGNORE INTO fiber_kpi_definitions (kpi_key, name, unit, category, description) VALUES
  ('FIBER_AVAILABILITY',  'Fiber Link Availability',  '%',   'Availability', 'Percentage of time fiber links are operational'),
  ('FIBER_ONU_REG_RATE',  'ONU Registration Rate',    '%',   'Accessibility','Percentage of ONUs successfully registered on OLT'),
  ('FIBER_DL_THROUGHPUT', 'Downstream Throughput',    'Mbps','Throughput',   'Average downstream throughput per OLT port'),
  ('FIBER_UL_THROUGHPUT', 'Upstream Throughput',      'Mbps','Throughput',   'Average upstream throughput per OLT port'),
  ('FIBER_RX_POWER',      'Optical Rx Power',         'dBm', 'Signal',       'Average received optical power at OLT'),
  ('FIBER_PACKET_LOSS',   'Packet Loss Rate',         '%',   'Quality',      'Percentage of packets lost on fiber links'),
  ('FIBER_LATENCY',       'Latency',                  'ms',  'Quality',      'Average round-trip latency on fiber network'),
  ('FIBER_LINK_UTIL',     'Link Utilization',         '%',   'Capacity',     'Average bandwidth utilization of fiber links'),
  ('FIBER_JITTER',        'Jitter',                   'ms',  'Quality',      'Average packet delay variation');

-- ── Seed QoS thresholds ─────────────────────────────────────────────────────
INSERT IGNORE INTO fiber_qos_thresholds (kpi_id, required_value, comparator)
SELECT kpi_id, 99.5,  '>=' FROM fiber_kpi_definitions WHERE kpi_key = 'FIBER_AVAILABILITY';
INSERT IGNORE INTO fiber_qos_thresholds (kpi_id, required_value, comparator)
SELECT kpi_id, 95.0,  '>=' FROM fiber_kpi_definitions WHERE kpi_key = 'FIBER_ONU_REG_RATE';
INSERT IGNORE INTO fiber_qos_thresholds (kpi_id, required_value, comparator)
SELECT kpi_id, 25.0,  '>=' FROM fiber_kpi_definitions WHERE kpi_key = 'FIBER_DL_THROUGHPUT';
INSERT IGNORE INTO fiber_qos_thresholds (kpi_id, required_value, comparator)
SELECT kpi_id, 5.0,   '>=' FROM fiber_kpi_definitions WHERE kpi_key = 'FIBER_UL_THROUGHPUT';
INSERT IGNORE INTO fiber_qos_thresholds (kpi_id, required_value, comparator)
SELECT kpi_id, -27.0, '>=' FROM fiber_kpi_definitions WHERE kpi_key = 'FIBER_RX_POWER';
INSERT IGNORE INTO fiber_qos_thresholds (kpi_id, required_value, comparator)
SELECT kpi_id, 1.0,   '<=' FROM fiber_kpi_definitions WHERE kpi_key = 'FIBER_PACKET_LOSS';
INSERT IGNORE INTO fiber_qos_thresholds (kpi_id, required_value, comparator)
SELECT kpi_id, 50.0,  '<=' FROM fiber_kpi_definitions WHERE kpi_key = 'FIBER_LATENCY';
INSERT IGNORE INTO fiber_qos_thresholds (kpi_id, required_value, comparator)
SELECT kpi_id, 80.0,  '<=' FROM fiber_kpi_definitions WHERE kpi_key = 'FIBER_LINK_UTIL';
INSERT IGNORE INTO fiber_qos_thresholds (kpi_id, required_value, comparator)
SELECT kpi_id, 10.0,  '<=' FROM fiber_kpi_definitions WHERE kpi_key = 'FIBER_JITTER';
