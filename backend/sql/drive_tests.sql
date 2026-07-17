-- Drive Test module tables
-- Run this against the NTNIP database to enable the Drive Test feature

CREATE TABLE IF NOT EXISTS drive_tests (
  drive_test_id  INT AUTO_INCREMENT PRIMARY KEY,
  operator_id    INT NOT NULL,
  test_name      VARCHAR(200) NOT NULL,
  test_date      DATE NOT NULL,
  route_type     ENUM('urban','suburban','rural','highway','indoor') DEFAULT 'urban',
  technology     VARCHAR(10),
  device_model   VARCHAR(100),
  tester_name    VARCHAR(100),
  notes          TEXT,
  status         ENUM('UPLOADED','PROCESSING','COMPLETED','FAILED') DEFAULT 'UPLOADED',
  total_samples  INT DEFAULT 0,
  distance_km    DECIMAL(8,2),
  duration_min   INT,
  overall_score  DECIMAL(5,2),
  ai_summary     TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operator_id) REFERENCES operators(operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS drive_test_samples (
  sample_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  drive_test_id  INT NOT NULL,
  ts             DATETIME,
  latitude       DECIMAL(10,7) NOT NULL,
  longitude      DECIMAL(10,7) NOT NULL,
  rsrp           DECIMAL(6,2),
  rsrq           DECIMAL(6,2),
  sinr           DECIMAL(6,2),
  rssi           DECIMAL(6,2),
  dl_throughput  DECIMAL(10,2),
  ul_throughput  DECIMAL(10,2),
  pci            INT,
  earfcn         INT,
  band           VARCHAR(20),
  event_type     VARCHAR(50),
  call_status    VARCHAR(20),
  serving_cell   VARCHAR(50),
  FOREIGN KEY (drive_test_id) REFERENCES drive_tests(drive_test_id) ON DELETE CASCADE,
  INDEX idx_dt_latlon (drive_test_id, latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
