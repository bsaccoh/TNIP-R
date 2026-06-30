-- ===========================================================================
-- TNIP-R — Telecom Network Intelligence Platform (Regulatory Edition)
-- MySQL 8.0 schema. Multi-tenant (operator-isolated), vendor-independent,
-- metadata-driven. Charset utf8mb4, InnoDB, FK constraints, soft deletes.
-- ===========================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── Identity & Access ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  role_id      INT AUTO_INCREMENT PRIMARY KEY,
  role_key     VARCHAR(40)  NOT NULL UNIQUE,          -- REGULATOR_ADMIN, REGULATOR_ANALYST, OPERATOR_USER, SYSTEM_ADMIN
  name         VARCHAR(80)  NOT NULL,
  description  VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  perm_key      VARCHAR(80) NOT NULL UNIQUE,          -- e.g. operators:write, compliance:read
  description   VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id)       REFERENCES roles(role_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- operators declared below users via FK; create operators first.
CREATE TABLE IF NOT EXISTS operators (
  operator_id    INT AUTO_INCREMENT PRIMARY KEY,
  operator_name  VARCHAR(120) NOT NULL,
  license_number VARCHAR(80)  UNIQUE,
  license_type   VARCHAR(80),
  status         ENUM('ACTIVE','SUSPENDED','UNDER_REVIEW') NOT NULL DEFAULT 'ACTIVE',
  country        VARCHAR(80)  DEFAULT 'Sierra Leone',
  contact_email  VARCHAR(160),
  logo_url       VARCHAR(255),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     TIMESTAMP NULL,
  INDEX idx_operator_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(120),
  role_id       INT NOT NULL,
  operator_id   INT NULL,                 -- non-null only for OPERATOR_USER (data isolation)
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  mfa_enabled   TINYINT(1) NOT NULL DEFAULT 0,
  mfa_secret    VARCHAR(64) NULL,
  last_login_at TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  FOREIGN KEY (role_id)     REFERENCES roles(role_id),
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
  INDEX idx_users_operator (operator_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  session_id     CHAR(36) PRIMARY KEY,                -- uuid; refresh-token family id
  user_id        INT NOT NULL,
  refresh_hash   VARCHAR(255) NOT NULL,               -- hashed refresh token
  user_agent     VARCHAR(255),
  ip_address     VARCHAR(64),
  expires_at     TIMESTAMP NOT NULL,
  revoked_at     TIMESTAMP NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL,
  operator_id INT NULL,
  action      VARCHAR(80) NOT NULL,                   -- LOGIN, OPERATOR_CREATE, PM_UPLOAD ...
  entity_type VARCHAR(80),
  entity_id   VARCHAR(80),
  detail      JSON NULL,
  ip_address  VARCHAR(64),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- ─── Operator detail ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operator_contacts (
  contact_id  INT AUTO_INCREMENT PRIMARY KEY,
  operator_id INT NOT NULL,
  name        VARCHAR(120),
  title       VARCHAR(120),
  email       VARCHAR(160),
  phone       VARCHAR(60),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS operator_licenses (
  license_id    INT AUTO_INCREMENT PRIMARY KEY,
  operator_id   INT NOT NULL,
  license_number VARCHAR(80),
  technology    VARCHAR(20),                          -- 2G/3G/4G/5G
  coverage_obligation VARCHAR(255),
  valid_from    DATE,
  valid_to      DATE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Inventory ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  vendor_id   INT AUTO_INCREMENT PRIMARY KEY,
  vendor_key  VARCHAR(40) NOT NULL UNIQUE,            -- HUAWEI, ERICSSON, NOKIA, ZTE
  name        VARCHAR(80) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS technologies (
  technology_id INT AUTO_INCREMENT PRIMARY KEY,
  tech_key      VARCHAR(20) NOT NULL UNIQUE,          -- 2G,3G,4G,5G
  generation    VARCHAR(20),
  name          VARCHAR(80)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS regions (
  region_id  INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  code       VARCHAR(40),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS districts (
  district_id INT AUTO_INCREMENT PRIMARY KEY,
  region_id   INT NOT NULL,
  name        VARCHAR(120) NOT NULL,
  code        VARCHAR(40),
  FOREIGN KEY (region_id) REFERENCES regions(region_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sites (
  site_id      INT AUTO_INCREMENT PRIMARY KEY,
  operator_id  INT NOT NULL,
  vendor_id    INT NULL,
  region_id    INT NULL,
  district_id  INT NULL,
  site_code    VARCHAR(80) NOT NULL,                  -- operator-scoped unique (e.g. SL0666)
  site_name    VARCHAR(160),
  latitude     DECIMAL(9,6),
  longitude    DECIMAL(9,6),
  tower_height DECIMAL(7,2) NULL,
  classification VARCHAR(60) NULL,                    -- Platinum/Gold/... and area class
  area_class   VARCHAR(60) NULL,                      -- Urban Area / Rural ...
  owner        VARCHAR(255) NULL,
  chiefdom     VARCHAR(120) NULL,
  location     VARCHAR(160) NULL,
  technologies VARCHAR(40) NULL,                      -- e.g. 2G3G4G (from site master)
  on_air_date  DATE NULL,
  site_type    VARCHAR(60) NULL,                      -- Greenfield/Rooftop ...
  status       ENUM('ACTIVE','DEGRADED','DOWN','PLANNED') DEFAULT 'ACTIVE',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL,
  UNIQUE KEY uq_site_operator_code (operator_id, site_code),
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
  FOREIGN KEY (vendor_id)   REFERENCES vendors(vendor_id),
  FOREIGN KEY (region_id)   REFERENCES regions(region_id),
  FOREIGN KEY (district_id) REFERENCES districts(district_id),
  INDEX idx_sites_operator (operator_id),
  INDEX idx_sites_region (region_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS network_elements (
  element_id   INT AUTO_INCREMENT PRIMARY KEY,
  operator_id  INT NOT NULL,
  site_id      INT NOT NULL,
  technology_id INT NULL,
  element_type ENUM('NODEB','ENODEB','GNODEB','BTS') NOT NULL,
  element_code VARCHAR(80),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id)   REFERENCES operators(operator_id),
  FOREIGN KEY (site_id)       REFERENCES sites(site_id) ON DELETE CASCADE,
  FOREIGN KEY (technology_id) REFERENCES technologies(technology_id),
  INDEX idx_elem_site (site_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cells (
  cell_id       INT AUTO_INCREMENT PRIMARY KEY,
  operator_id   INT NOT NULL,
  site_id       INT NOT NULL,
  element_id    INT NULL,
  technology_id INT NULL,
  cell_code     VARCHAR(80) NOT NULL,                 -- canonical: <siteCode>_<tech>_LC<localCellId>
  cell_name     VARCHAR(160),
  ne_name       VARCHAR(160) NULL,
  local_cell_id VARCHAR(40)  NULL,
  cgi           VARCHAR(60)  NULL,                    -- MCC-MNC-LAC-CI (globally unique)
  lac           VARCHAR(20)  NULL,
  mcc           VARCHAR(10)  NULL,
  mnc           VARCHAR(10)  NULL,
  enodeb_id     VARCHAR(40)  NULL,
  bsc_name      VARCHAR(80)  NULL,                    -- BSC/RNC name
  latitude      DECIMAL(9,6) NULL,
  longitude     DECIMAL(9,6) NULL,
  status        ENUM('ACTIVE','DEGRADED','DOWN','PLANNED') DEFAULT 'ACTIVE',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  UNIQUE KEY uq_cell_operator_code (operator_id, cell_code),
  FOREIGN KEY (operator_id)   REFERENCES operators(operator_id),
  FOREIGN KEY (site_id)       REFERENCES sites(site_id) ON DELETE CASCADE,
  FOREIGN KEY (element_id)    REFERENCES network_elements(element_id),
  FOREIGN KEY (technology_id) REFERENCES technologies(technology_id),
  INDEX idx_cells_operator (operator_id),
  INDEX idx_cells_site (site_id),
  INDEX idx_cells_cgi (cgi)
) ENGINE=InnoDB;

-- ─── Network reference (denormalized cell/site/location mapping) ───────────
-- Master mapping populated from the operator Geo-Dimension. One row per cell;
-- the authoritative lookup to enrich/locate PM data (site, region, coords, CGI).
CREATE TABLE IF NOT EXISTS network_reference (
  ref_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  operator_id   INT NOT NULL,
  technology    VARCHAR(10),                          -- 2G/3G/4G/5G
  site_code     VARCHAR(80) NOT NULL,                 -- SLxxxx
  site_name     VARCHAR(160),
  cell_code     VARCHAR(80),                          -- canonical <site>_<tech>_LC<huaweiLcid>
  cell_name     VARCHAR(160),
  ne_name       VARCHAR(160),
  huawei_lcid   VARCHAR(40),                          -- PM-join key (CellName suffix)
  sector_id     VARCHAR(40),                          -- GEO-DIM LocalCellID (sector index)
  cgi           VARCHAR(60),
  lac           VARCHAR(20),
  enodeb_id     VARCHAR(40),
  bsc_name      VARCHAR(80),
  region        VARCHAR(120),
  district      VARCHAR(120),
  chiefdom      VARCHAR(120),
  location      VARCHAR(160),
  latitude      DECIMAL(9,6),
  longitude     DECIMAL(9,6),
  source        VARCHAR(60) DEFAULT 'geo-dimension',
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ref_cell (operator_id, cell_code),
  INDEX idx_ref_site (operator_id, site_code),
  INDEX idx_ref_cgi (cgi),
  INDEX idx_ref_tech (operator_id, technology)
) ENGINE=InnoDB;

-- ─── Data ingestion ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_files (
  pm_file_id    INT AUTO_INCREMENT PRIMARY KEY,
  operator_id   INT NOT NULL,
  vendor_id     INT NULL,
  technology_id INT NULL,
  uploaded_by   INT NULL,
  file_name     VARCHAR(255) NOT NULL,
  stored_path   VARCHAR(512),
  file_hash     CHAR(64),                             -- sha256 for duplicate detection
  source_host   VARCHAR(40)  NULL,                    -- e.g. HOST03 (Huawei pmresult export host)
  meas_type_id  VARCHAR(40)  NULL,                    -- Huawei measurement function-set id (filename field)
  format        VARCHAR(40)  DEFAULT 'huawei-pmresult',
  reliability_skipped INT DEFAULT 0,                  -- count of Unreliable rows excluded
  granularity   ENUM('15MIN','30MIN','HOUR','DAY','WEEK','MONTH') DEFAULT 'DAY',
  period_start  DATETIME NULL,
  period_end    DATETIME NULL,
  row_count     INT DEFAULT 0,
  status        ENUM('UPLOADED','PARSING','PARSED','CALCULATED','FAILED','DUPLICATE') DEFAULT 'UPLOADED',
  error_message TEXT NULL,
  upload_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id)   REFERENCES operators(operator_id),
  FOREIGN KEY (vendor_id)     REFERENCES vendors(vendor_id),
  FOREIGN KEY (technology_id) REFERENCES technologies(technology_id),
  FOREIGN KEY (uploaded_by)   REFERENCES users(user_id),
  UNIQUE KEY uq_pmfile_hash (operator_id, file_hash),
  INDEX idx_pmfile_operator (operator_id),
  INDEX idx_pmfile_status (status)
) ENGINE=InnoDB;

-- SFTP feeds — pull raw PM data in real time (polling) or on-demand batch.
CREATE TABLE IF NOT EXISTS sftp_connections (
  sftp_id         INT AUTO_INCREMENT PRIMARY KEY,
  operator_id     INT NOT NULL,
  name            VARCHAR(120) NOT NULL,
  host            VARCHAR(160) NOT NULL,
  port            INT DEFAULT 22,
  username        VARCHAR(120) NOT NULL,
  auth_type       ENUM('PASSWORD','KEY') DEFAULT 'PASSWORD',
  secret          TEXT,                                -- password or private key (encrypt at rest in prod)
  remote_path     VARCHAR(512) NOT NULL,
  file_pattern    VARCHAR(160) DEFAULT '%.csv.gz',     -- SQL-LIKE / glob-ish match
  delete_after    TINYINT(1) DEFAULT 0,                -- remove remote file after successful pull
  poll_enabled    TINYINT(1) DEFAULT 0,
  poll_interval_sec INT DEFAULT 300,
  last_run_at     TIMESTAMP NULL,
  last_status     VARCHAR(40) NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
  INDEX idx_sftp_operator (operator_id)
) ENGINE=InnoDB;

-- Tracks every file the poller has already pulled (idempotent re-polling).
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  job_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  sftp_id       INT NULL,
  operator_id   INT NOT NULL,
  source        ENUM('SFTP','UPLOAD','BATCH') DEFAULT 'SFTP',
  remote_file   VARCHAR(512),
  pm_file_id    INT NULL,
  status        ENUM('PENDING','RUNNING','DONE','FAILED','DUPLICATE') DEFAULT 'PENDING',
  message       VARCHAR(512),
  started_at    TIMESTAMP NULL,
  finished_at   TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
  FOREIGN KEY (sftp_id) REFERENCES sftp_connections(sftp_id) ON DELETE SET NULL,
  INDEX idx_job_remote (sftp_id, remote_file),
  INDEX idx_job_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pm_file_logs (
  log_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  pm_file_id  INT NOT NULL,
  level       ENUM('INFO','WARN','ERROR') DEFAULT 'INFO',
  message     VARCHAR(512),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pm_file_id) REFERENCES pm_files(pm_file_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Counter dictionary & values ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS counter_units (
  unit_id INT AUTO_INCREMENT PRIMARY KEY,
  symbol  VARCHAR(20) NOT NULL UNIQUE,
  name    VARCHAR(80)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS counter_definitions (
  counter_id    INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id     INT NULL,
  technology_id INT NULL,
  counter_key   VARCHAR(120) NOT NULL,                -- vendor counter id/name, e.g. 50331655 or L.RRC.ConnReq.Att
  counter_name  VARCHAR(200),
  meas_type_id  VARCHAR(40) NULL,                     -- Huawei measurement function-set id (provenance for numeric IDs)
  raw_unit      VARCHAR(40) NULL,                     -- unit text from the PM units row (e.g. 'per mill','bit/s')
  unit_id       INT NULL,
  category      VARCHAR(80),
  measurement_object VARCHAR(80),                     -- CELL, ULOCELL, IUR, ENODEB ...
  aggregation   ENUM('SUM','AVG','MAX','MIN','LAST') DEFAULT 'SUM',
  description    VARCHAR(512),
  status        ENUM('MAPPED','UNKNOWN','DEPRECATED') DEFAULT 'MAPPED',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_counter_key (vendor_id, technology_id, counter_key),
  FOREIGN KEY (vendor_id)     REFERENCES vendors(vendor_id),
  FOREIGN KEY (technology_id) REFERENCES technologies(technology_id),
  FOREIGN KEY (unit_id)       REFERENCES counter_units(unit_id),
  INDEX idx_counter_status (status)
) ENGINE=InnoDB;

-- High-volume fact table. Partition-ready by timestamp in production.
CREATE TABLE IF NOT EXISTS counter_values (
  counter_value_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  operator_id  INT NOT NULL,
  pm_file_id   INT NOT NULL,
  site_id      INT NULL,
  cell_id      INT NULL,
  counter_id   INT NOT NULL,
  ts           DATETIME NOT NULL,
  value        DOUBLE NULL,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
  FOREIGN KEY (pm_file_id)  REFERENCES pm_files(pm_file_id) ON DELETE CASCADE,
  FOREIGN KEY (cell_id)     REFERENCES cells(cell_id),
  FOREIGN KEY (counter_id)  REFERENCES counter_definitions(counter_id),
  INDEX idx_cv_lookup (operator_id, cell_id, counter_id, ts),
  INDEX idx_cv_file (pm_file_id),
  INDEX idx_cv_ts (ts)
) ENGINE=InnoDB;

-- ─── KPI engine ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpi_definitions (
  kpi_id      INT AUTO_INCREMENT PRIMARY KEY,
  kpi_key     VARCHAR(60) NOT NULL UNIQUE,            -- CSSR, CALL_DROP_RATE ...
  name        VARCHAR(120) NOT NULL,
  category    VARCHAR(60),                            -- Accessibility, Retainability ...
  unit        VARCHAR(20),                            -- %, Mbps, ms ...
  direction   ENUM('HIGHER_BETTER','LOWER_BETTER') DEFAULT 'HIGHER_BETTER',
  description VARCHAR(512),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kpi_formulas (
  formula_id    INT AUTO_INCREMENT PRIMARY KEY,
  kpi_id        INT NOT NULL,
  vendor_id     INT NULL,                             -- null = applies to all vendors
  technology_id INT NULL,                             -- null = all technologies
  operator_id   INT NULL,                             -- null = all operators (global)
  expression    TEXT NOT NULL,                        -- math expr referencing {COUNTER_KEY}
  is_active     TINYINT(1) DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kpi_id)        REFERENCES kpi_definitions(kpi_id),
  FOREIGN KEY (vendor_id)     REFERENCES vendors(vendor_id),
  FOREIGN KEY (technology_id) REFERENCES technologies(technology_id),
  FOREIGN KEY (operator_id)   REFERENCES operators(operator_id),
  INDEX idx_formula_kpi (kpi_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kpi_formula_versions (
  version_id  INT AUTO_INCREMENT PRIMARY KEY,
  formula_id  INT NOT NULL,
  version_no  INT NOT NULL,
  expression  TEXT NOT NULL,
  changed_by  INT NULL,
  change_note VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (formula_id) REFERENCES kpi_formulas(formula_id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS calculated_kpis (
  kpi_calc_id  BIGINT AUTO_INCREMENT PRIMARY KEY,
  operator_id  INT NOT NULL,
  kpi_id       INT NOT NULL,
  site_id      INT NULL,
  cell_id      INT NULL,
  region_id    INT NULL,
  technology_id INT NULL,
  ts           DATETIME NOT NULL,
  granularity  ENUM('15MIN','HOUR','DAY','WEEK','MONTH','QUARTER','YEAR') DEFAULT 'DAY',
  value        DOUBLE NULL,
  sample_count INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
  FOREIGN KEY (kpi_id)      REFERENCES kpi_definitions(kpi_id),
  FOREIGN KEY (cell_id)     REFERENCES cells(cell_id),
  INDEX idx_ckpi_lookup (operator_id, kpi_id, granularity, ts),
  INDEX idx_ckpi_cell (cell_id),
  INDEX idx_ckpi_region (region_id)
) ENGINE=InnoDB;

-- ─── Compliance ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qos_thresholds (
  threshold_id  INT AUTO_INCREMENT PRIMARY KEY,
  kpi_id        INT NOT NULL,
  technology_id INT NULL,                             -- null = global
  operator_id   INT NULL,                             -- null = all operators
  comparator    ENUM('GTE','LTE','GT','LT') NOT NULL, -- required relationship
  required_value DOUBLE NOT NULL,
  warning_margin DOUBLE DEFAULT 0,                    -- distance from threshold that triggers WARNING
  effective_from DATE NOT NULL,
  effective_to   DATE NULL,
  version_no    INT DEFAULT 1,
  is_active     TINYINT(1) DEFAULT 1,
  created_by    INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kpi_id)        REFERENCES kpi_definitions(kpi_id),
  FOREIGN KEY (technology_id) REFERENCES technologies(technology_id),
  FOREIGN KEY (operator_id)   REFERENCES operators(operator_id),
  INDEX idx_threshold_kpi (kpi_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compliance_results (
  compliance_id  BIGINT AUTO_INCREMENT PRIMARY KEY,
  operator_id    INT NOT NULL,
  kpi_id         INT NOT NULL,
  threshold_id   INT NOT NULL,
  technology_id  INT NULL,
  period         VARCHAR(20) NOT NULL,                -- e.g. 2026-06 or 2026-W26
  granularity    ENUM('DAY','WEEK','MONTH','QUARTER','YEAR') DEFAULT 'MONTH',
  value          DOUBLE,
  required_value DOUBLE,
  status         ENUM('PASS','WARNING','FAIL') NOT NULL,
  evaluated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id)  REFERENCES operators(operator_id),
  FOREIGN KEY (kpi_id)       REFERENCES kpi_definitions(kpi_id),
  FOREIGN KEY (threshold_id) REFERENCES qos_thresholds(threshold_id),
  UNIQUE KEY uq_compliance (operator_id, kpi_id, technology_id, period),
  INDEX idx_compliance_operator (operator_id),
  INDEX idx_compliance_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compliance_alerts (
  alert_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  compliance_id BIGINT NOT NULL,
  operator_id   INT NOT NULL,
  severity      ENUM('WARNING','VIOLATION') NOT NULL,
  message       VARCHAR(512),
  acknowledged  TINYINT(1) DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (compliance_id) REFERENCES compliance_results(compliance_id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id)   REFERENCES operators(operator_id)
) ENGINE=InnoDB;

-- ─── Ranking ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ranking_configurations (
  config_id   INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  is_active   TINYINT(1) DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ranking_weights (
  weight_id  INT AUTO_INCREMENT PRIMARY KEY,
  config_id  INT NOT NULL,
  kpi_id     INT NOT NULL,
  weight     DOUBLE NOT NULL DEFAULT 1,
  FOREIGN KEY (config_id) REFERENCES ranking_configurations(config_id) ON DELETE CASCADE,
  FOREIGN KEY (kpi_id)    REFERENCES kpi_definitions(kpi_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS operator_rankings (
  ranking_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
  config_id    INT NULL,
  operator_id  INT NOT NULL,
  period       VARCHAR(20) NOT NULL,
  granularity  ENUM('DAY','WEEK','MONTH','QUARTER','YEAR') DEFAULT 'MONTH',
  qos_score    DOUBLE,
  rank_position INT,
  trend        ENUM('UP','DOWN','FLAT') DEFAULT 'FLAT',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
  UNIQUE KEY uq_ranking (operator_id, period, granularity),
  INDEX idx_ranking_period (period)
) ENGINE=InnoDB;

-- ─── AI & insights ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anomaly_detections (
  anomaly_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
  operator_id  INT NOT NULL,
  kpi_id       INT NOT NULL,
  cell_id      INT NULL,
  ts           DATETIME NOT NULL,
  value        DOUBLE,
  expected     DOUBLE,
  deviation    DOUBLE,
  method       VARCHAR(40) DEFAULT 'zscore',
  severity     ENUM('LOW','MEDIUM','HIGH') DEFAULT 'MEDIUM',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
  FOREIGN KEY (kpi_id)      REFERENCES kpi_definitions(kpi_id),
  INDEX idx_anomaly_operator (operator_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_recommendations (
  rec_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  operator_id  INT NULL,
  scope        VARCHAR(40),                           -- NATIONAL, OPERATOR, REGION ...
  title        VARCHAR(200),
  body         TEXT,
  severity     ENUM('INFO','WARNING','CRITICAL') DEFAULT 'INFO',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS forecasts (
  forecast_id  BIGINT AUTO_INCREMENT PRIMARY KEY,
  operator_id  INT NOT NULL,
  kpi_id       INT NOT NULL,
  horizon_ts   DATETIME NOT NULL,
  predicted    DOUBLE,
  method       VARCHAR(40) DEFAULT 'linear',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
  FOREIGN KEY (kpi_id)      REFERENCES kpi_definitions(kpi_id)
) ENGINE=InnoDB;

-- ─── Alarm / event correlation (placeholder data model) ────────────────────
CREATE TABLE IF NOT EXISTS alarms (
  alarm_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  operator_id INT NOT NULL,
  site_id     INT NULL,
  cell_id     INT NULL,
  alarm_code  VARCHAR(80),
  severity    ENUM('CLEARED','WARNING','MINOR','MAJOR','CRITICAL') DEFAULT 'MINOR',
  raised_at   DATETIME,
  cleared_at  DATETIME NULL,
  description VARCHAR(512),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id),
  INDEX idx_alarm_operator (operator_id)
) ENGINE=InnoDB;

-- ─── Reporting ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  report_id   INT AUTO_INCREMENT PRIMARY KEY,
  report_type VARCHAR(80) NOT NULL,
  operator_id INT NULL,
  params      JSON NULL,
  status      ENUM('QUEUED','RUNNING','DONE','FAILED') DEFAULT 'QUEUED',
  requested_by INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id)  REFERENCES operators(operator_id),
  FOREIGN KEY (requested_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS report_exports (
  export_id   INT AUTO_INCREMENT PRIMARY KEY,
  report_id   INT NOT NULL,
  format      ENUM('PDF','XLSX','CSV') NOT NULL,
  file_path   VARCHAR(512),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(report_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── System ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS application_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  value       VARCHAR(512),
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL,
  operator_id INT NULL,
  title       VARCHAR(160),
  body        VARCHAR(512),
  is_read     TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
