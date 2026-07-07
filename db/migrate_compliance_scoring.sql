SET NAMES utf8mb4;
USE tnipr;

-- ── Compliance scores (operator × domain × period) ─────────────────────────
CREATE TABLE IF NOT EXISTS compliance_scores (
  score_id     INT          NOT NULL AUTO_INCREMENT,
  operator_id  INT          NOT NULL,
  domain       ENUM('RAN','FIBER','CORE','CONSUMER','OVERALL') NOT NULL,
  period       DATE         NOT NULL,
  score        DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  kpi_pass     INT          NOT NULL DEFAULT 0,
  kpi_total    INT          NOT NULL DEFAULT 0,
  details      JSON         DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (score_id),
  UNIQUE KEY uq_cs (operator_id, domain, period),
  KEY idx_cs_period (period),
  CONSTRAINT fk_cs_operator FOREIGN KEY (operator_id) REFERENCES operators (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Seed compliance scores for last 6 months ────────────────────────────────
SET @af = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Africell%'  LIMIT 1);
SET @or = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Orange%'    LIMIT 1);
SET @st = (SELECT operator_id FROM operators WHERE operator_name LIKE '%SierraTel%' LIMIT 1);
SET @qc = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Qcell%'     LIMIT 1);

-- Helper: insert scores for one operator across months
-- Africell — generally strong
INSERT INTO compliance_scores (operator_id, domain, period, score, kpi_pass, kpi_total) VALUES
(@af, 'RAN',      '2026-02-01', 88.5, 13, 15),
(@af, 'RAN',      '2026-03-01', 90.2, 14, 15),
(@af, 'RAN',      '2026-04-01', 87.8, 13, 15),
(@af, 'RAN',      '2026-05-01', 91.5, 14, 15),
(@af, 'RAN',      '2026-06-01', 89.3, 13, 15),
(@af, 'RAN',      '2026-07-01', 92.1, 14, 15),
(@af, 'FIBER',    '2026-02-01', 82.0, 7, 9),
(@af, 'FIBER',    '2026-03-01', 85.3, 7, 9),
(@af, 'FIBER',    '2026-04-01', 83.7, 7, 9),
(@af, 'FIBER',    '2026-05-01', 86.9, 8, 9),
(@af, 'FIBER',    '2026-06-01', 84.5, 7, 9),
(@af, 'FIBER',    '2026-07-01', 87.2, 8, 9),
(@af, 'CONSUMER', '2026-02-01', 75.0, 6, 8),
(@af, 'CONSUMER', '2026-03-01', 78.5, 6, 8),
(@af, 'CONSUMER', '2026-04-01', 76.2, 6, 8),
(@af, 'CONSUMER', '2026-05-01', 80.1, 7, 8),
(@af, 'CONSUMER', '2026-06-01', 77.8, 6, 8),
(@af, 'CONSUMER', '2026-07-01', 81.5, 7, 8),
(@af, 'OVERALL',  '2026-02-01', 81.8, 26, 32),
(@af, 'OVERALL',  '2026-03-01', 84.7, 27, 32),
(@af, 'OVERALL',  '2026-04-01', 82.6, 26, 32),
(@af, 'OVERALL',  '2026-05-01', 86.2, 29, 32),
(@af, 'OVERALL',  '2026-06-01', 83.9, 26, 32),
(@af, 'OVERALL',  '2026-07-01', 86.9, 29, 32);

-- Orange — mid-range
INSERT INTO compliance_scores (operator_id, domain, period, score, kpi_pass, kpi_total) VALUES
(@or, 'RAN',      '2026-02-01', 82.0, 12, 15),
(@or, 'RAN',      '2026-03-01', 84.5, 13, 15),
(@or, 'RAN',      '2026-04-01', 81.3, 12, 15),
(@or, 'RAN',      '2026-05-01', 85.7, 13, 15),
(@or, 'RAN',      '2026-06-01', 83.2, 12, 15),
(@or, 'RAN',      '2026-07-01', 86.4, 13, 15),
(@or, 'FIBER',    '2026-02-01', 78.5, 6, 9),
(@or, 'FIBER',    '2026-03-01', 80.1, 7, 9),
(@or, 'FIBER',    '2026-04-01', 77.8, 6, 9),
(@or, 'FIBER',    '2026-05-01', 81.6, 7, 9),
(@or, 'FIBER',    '2026-06-01', 79.3, 7, 9),
(@or, 'FIBER',    '2026-07-01', 76.8, 6, 9),
(@or, 'CONSUMER', '2026-02-01', 70.5, 5, 8),
(@or, 'CONSUMER', '2026-03-01', 73.2, 6, 8),
(@or, 'CONSUMER', '2026-04-01', 71.8, 5, 8),
(@or, 'CONSUMER', '2026-05-01', 74.5, 6, 8),
(@or, 'CONSUMER', '2026-06-01', 72.0, 5, 8),
(@or, 'CONSUMER', '2026-07-01', 69.3, 5, 8),
(@or, 'OVERALL',  '2026-02-01', 77.0, 23, 32),
(@or, 'OVERALL',  '2026-03-01', 79.3, 26, 32),
(@or, 'OVERALL',  '2026-04-01', 76.9, 23, 32),
(@or, 'OVERALL',  '2026-05-01', 80.6, 26, 32),
(@or, 'OVERALL',  '2026-06-01', 78.2, 24, 32),
(@or, 'OVERALL',  '2026-07-01', 77.5, 24, 32);

-- SierraTel — weaker, legacy infra
INSERT INTO compliance_scores (operator_id, domain, period, score, kpi_pass, kpi_total) VALUES
(@st, 'RAN',      '2026-02-01', 72.3, 10, 15),
(@st, 'RAN',      '2026-03-01', 74.8, 11, 15),
(@st, 'RAN',      '2026-04-01', 71.5, 10, 15),
(@st, 'RAN',      '2026-05-01', 75.2, 11, 15),
(@st, 'RAN',      '2026-06-01', 73.0, 10, 15),
(@st, 'RAN',      '2026-07-01', 76.5, 11, 15),
(@st, 'FIBER',    '2026-02-01', 68.0, 5, 9),
(@st, 'FIBER',    '2026-03-01', 70.5, 6, 9),
(@st, 'FIBER',    '2026-04-01', 67.2, 5, 9),
(@st, 'FIBER',    '2026-05-01', 71.8, 6, 9),
(@st, 'FIBER',    '2026-06-01', 69.5, 6, 9),
(@st, 'FIBER',    '2026-07-01', 72.1, 6, 9),
(@st, 'CONSUMER', '2026-02-01', 58.5, 4, 8),
(@st, 'CONSUMER', '2026-03-01', 61.0, 4, 8),
(@st, 'CONSUMER', '2026-04-01', 59.3, 4, 8),
(@st, 'CONSUMER', '2026-05-01', 62.7, 5, 8),
(@st, 'CONSUMER', '2026-06-01', 60.1, 4, 8),
(@st, 'CONSUMER', '2026-07-01', 63.8, 5, 8),
(@st, 'OVERALL',  '2026-02-01', 66.3, 19, 32),
(@st, 'OVERALL',  '2026-03-01', 68.8, 21, 32),
(@st, 'OVERALL',  '2026-04-01', 66.0, 19, 32),
(@st, 'OVERALL',  '2026-05-01', 69.9, 22, 32),
(@st, 'OVERALL',  '2026-06-01', 67.5, 20, 32),
(@st, 'OVERALL',  '2026-07-01', 70.8, 22, 32);

-- Qcell — smallest, moderate
INSERT INTO compliance_scores (operator_id, domain, period, score, kpi_pass, kpi_total) VALUES
(@qc, 'RAN',      '2026-02-01', 79.5, 12, 15),
(@qc, 'RAN',      '2026-03-01', 81.0, 12, 15),
(@qc, 'RAN',      '2026-04-01', 78.7, 11, 15),
(@qc, 'RAN',      '2026-05-01', 82.3, 12, 15),
(@qc, 'RAN',      '2026-06-01', 80.1, 12, 15),
(@qc, 'RAN',      '2026-07-01', 83.5, 13, 15),
(@qc, 'FIBER',    '2026-02-01', 74.0, 6, 9),
(@qc, 'FIBER',    '2026-03-01', 76.5, 6, 9),
(@qc, 'FIBER',    '2026-04-01', 73.2, 6, 9),
(@qc, 'FIBER',    '2026-05-01', 77.8, 7, 9),
(@qc, 'FIBER',    '2026-06-01', 75.0, 6, 9),
(@qc, 'FIBER',    '2026-07-01', 78.3, 7, 9),
(@qc, 'CONSUMER', '2026-02-01', 65.0, 5, 8),
(@qc, 'CONSUMER', '2026-03-01', 67.5, 5, 8),
(@qc, 'CONSUMER', '2026-04-01', 64.3, 5, 8),
(@qc, 'CONSUMER', '2026-05-01', 68.9, 5, 8),
(@qc, 'CONSUMER', '2026-06-01', 66.2, 5, 8),
(@qc, 'CONSUMER', '2026-07-01', 69.7, 5, 8),
(@qc, 'OVERALL',  '2026-02-01', 72.8, 23, 32),
(@qc, 'OVERALL',  '2026-03-01', 75.0, 23, 32),
(@qc, 'OVERALL',  '2026-04-01', 72.1, 22, 32),
(@qc, 'OVERALL',  '2026-05-01', 76.3, 24, 32),
(@qc, 'OVERALL',  '2026-06-01', 73.8, 23, 32),
(@qc, 'OVERALL',  '2026-07-01', 77.2, 25, 32);
