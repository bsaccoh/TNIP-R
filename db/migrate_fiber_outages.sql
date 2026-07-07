SET NAMES utf8mb4;
USE tnipr;

-- ── Fiber outage / incident events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiber_outages (
  outage_id     INT          NOT NULL AUTO_INCREMENT,
  link_id       INT          DEFAULT NULL,
  operator_id   INT          NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT         DEFAULT NULL,
  severity      ENUM('CRITICAL','MAJOR','MINOR') NOT NULL DEFAULT 'MAJOR',
  status        ENUM('ACTIVE','RESOLVED','INVESTIGATING') NOT NULL DEFAULT 'ACTIVE',
  city_a        VARCHAR(100) DEFAULT NULL,
  city_b        VARCHAR(100) DEFAULT NULL,
  affected_km   DECIMAL(8,2) DEFAULT NULL,
  started_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at   DATETIME     DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (outage_id),
  KEY idx_fo_operator (operator_id),
  KEY idx_fo_status   (status),
  CONSTRAINT fk_fo_operator FOREIGN KEY (operator_id) REFERENCES operators (operator_id),
  CONSTRAINT fk_fo_link     FOREIGN KEY (link_id)     REFERENCES fiber_links (link_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Seed sample outages ─────────────────────────────────────────────────────
SET @st = (SELECT operator_id FROM operators WHERE operator_name LIKE '%SierraTel%' LIMIT 1);
SET @af = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Africell%'  LIMIT 1);
SET @qc = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Qcell%'     LIMIT 1);

-- Find link_ids for the degraded/down links
SET @st_knm_kld = (SELECT link_id FROM fiber_links WHERE node_a_id = (SELECT node_id FROM fiber_nodes WHERE node_name='ST-HUB-KNM') AND node_b_id = (SELECT node_id FROM fiber_nodes WHERE node_name='ST-HUB-KLD') LIMIT 1);
SET @or_bo_knm  = (SELECT link_id FROM fiber_links WHERE node_a_id = (SELECT node_id FROM fiber_nodes WHERE node_name='OR-HUB-BO')  AND node_b_id = (SELECT node_id FROM fiber_nodes WHERE node_name='OR-HUB-KNM') LIMIT 1);
SET @qc_bo_mkn  = (SELECT link_id FROM fiber_links WHERE node_a_id = (SELECT node_id FROM fiber_nodes WHERE node_name='QC-HUB-BO')  AND node_b_id = (SELECT node_id FROM fiber_nodes WHERE node_name='QC-HUB-MKN') LIMIT 1);

INSERT INTO fiber_outages (link_id, operator_id, title, description, severity, status, city_a, city_b, affected_km, started_at) VALUES
(@st_knm_kld, @st, 'Fiber cut: Kenema–Koidu span', 'Road construction crew damaged buried fiber cable at km 42. OTDR confirms break at splice point S-47.', 'MAJOR', 'INVESTIGATING', 'Kenema', 'Koidu', 80.0, '2026-07-06 14:30:00'),
(@or_bo_knm,  (SELECT operator_id FROM operators WHERE operator_name LIKE '%Orange%' LIMIT 1), 'Degraded link: Bo–Kenema', 'Elevated BER on DWDM channel 34. Optical power at receiver below -24 dBm threshold. Patch panel inspection scheduled.', 'MINOR', 'INVESTIGATING', 'Bo', 'Kenema', 65.0, '2026-07-05 09:15:00'),
(@qc_bo_mkn,  @qc, 'Link down: Bo–Makeni backbone', 'Complete loss of signal on backbone link. Cause under investigation — suspected vandalism near Magburaka.', 'CRITICAL', 'ACTIVE', 'Bo', 'Makeni', 235.0, '2026-07-07 02:45:00');

-- A resolved outage for history
INSERT INTO fiber_outages (link_id, operator_id, title, description, severity, status, city_a, city_b, affected_km, started_at, resolved_at) VALUES
(NULL, @af, 'Fiber cut: Freetown metro ring', 'Accidental cable cut during utility works on Wilkinson Road. Emergency splice completed.', 'CRITICAL', 'RESOLVED', 'Freetown', 'Waterloo', 30.0, '2026-07-03 18:20:00', '2026-07-04 06:45:00');
