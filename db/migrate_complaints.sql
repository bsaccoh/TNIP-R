SET NAMES utf8mb4;
USE tnipr;

-- ── Consumer complaints ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  complaint_id   INT          NOT NULL AUTO_INCREMENT,
  operator_id    INT          NOT NULL,
  reference_no   VARCHAR(30)  NOT NULL,
  subscriber_msisdn VARCHAR(20) DEFAULT NULL,
  category       ENUM('CALL_DROP','NO_COVERAGE','SLOW_DATA','BILLING','SERVICE_OUTAGE','POOR_VOICE','SMS_FAILURE','OTHER') NOT NULL DEFAULT 'OTHER',
  severity       ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  status         ENUM('OPEN','INVESTIGATING','RESOLVED','CLOSED','ESCALATED') NOT NULL DEFAULT 'OPEN',
  subject        VARCHAR(255) NOT NULL,
  description    TEXT         DEFAULT NULL,
  district       VARCHAR(100) DEFAULT NULL,
  city           VARCHAR(100) DEFAULT NULL,
  lat            DECIMAL(9,6) DEFAULT NULL,
  lng            DECIMAL(9,6) DEFAULT NULL,
  technology     VARCHAR(10)  DEFAULT NULL,
  cell_id        VARCHAR(50)  DEFAULT NULL,
  resolution     TEXT         DEFAULT NULL,
  reported_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at    DATETIME     DEFAULT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (complaint_id),
  UNIQUE KEY uq_ref (reference_no),
  KEY idx_c_operator (operator_id),
  KEY idx_c_status   (status),
  KEY idx_c_category (category),
  KEY idx_c_reported (reported_at),
  CONSTRAINT fk_c_operator FOREIGN KEY (operator_id) REFERENCES operators (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Seed sample complaints ──────────────────────────────────────────────────
SET @af = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Africell%'  LIMIT 1);
SET @or = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Orange%'    LIMIT 1);
SET @st = (SELECT operator_id FROM operators WHERE operator_name LIKE '%SierraTel%' LIMIT 1);
SET @qc = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Qcell%'     LIMIT 1);

INSERT INTO complaints (operator_id, reference_no, subscriber_msisdn, category, severity, status, subject, description, district, city, lat, lng, technology, reported_at) VALUES
(@af, 'CMP-2026-0001', '23276100001', 'CALL_DROP', 'HIGH', 'OPEN', 'Frequent call drops in Hill Station', 'Calls drop within 30 seconds of connection. Happening consistently for 3 days. RSRP shows -115 dBm.', 'Western Area Urban', 'Freetown', 8.4600, -13.2400, '4G', '2026-07-05 10:30:00'),
(@af, 'CMP-2026-0002', '23276100002', 'SLOW_DATA', 'MEDIUM', 'INVESTIGATING', 'Very slow internet speed at Lumley Beach', 'Download speed below 1 Mbps during peak hours. Speed test confirms 0.5 Mbps at 6 PM.', 'Western Area Urban', 'Freetown', 8.4780, -13.2780, '4G', '2026-07-04 14:15:00'),
(@or, 'CMP-2026-0003', '23279200003', 'NO_COVERAGE', 'HIGH', 'OPEN', 'No signal at Regent village', 'Complete loss of network coverage. Phone shows "No Service". Multiple residents affected.', 'Western Area Rural', 'Regent', 8.4250, -13.2050, '3G', '2026-07-06 08:45:00'),
(@or, 'CMP-2026-0004', '23279200004', 'SERVICE_OUTAGE', 'CRITICAL', 'ESCALATED', 'Total network outage in Waterloo area', 'No voice or data service for 6+ hours. Affecting thousands of subscribers. Emergency calls also failing.', 'Western Area Rural', 'Waterloo', 8.3380, -13.0480, '2G', '2026-07-06 22:00:00'),
(@st, 'CMP-2026-0005', '23230500005', 'POOR_VOICE', 'MEDIUM', 'OPEN', 'Echo and distortion on calls in Bo', 'Voice quality very poor with echo. Happens on both incoming and outgoing calls.', 'Bo', 'Bo', 7.9647, -11.7383, '3G', '2026-07-05 16:00:00'),
(@st, 'CMP-2026-0006', '23230500006', 'BILLING', 'LOW', 'RESOLVED', 'Overcharged for data bundle', 'Purchased 1GB bundle for Le 15,000 but was charged Le 25,000. Balance deducted incorrectly.', 'Bo', 'Bo', 7.9700, -11.7400, NULL, '2026-07-02 09:30:00'),
(@qc, 'CMP-2026-0007', '23233700007', 'CALL_DROP', 'HIGH', 'INVESTIGATING', 'Calls dropping at Makeni Junction', 'All calls drop when passing through junction area. Affects voice and video calls.', 'Bombali', 'Makeni', 8.8770, -12.0430, '4G', '2026-07-06 11:20:00'),
(@af, 'CMP-2026-0008', '23276100008', 'SLOW_DATA', 'MEDIUM', 'OPEN', 'Internet unusable at Kenema market area', 'Data speed extremely slow. Cannot load WhatsApp messages or web pages.', 'Kenema', 'Kenema', 7.8760, -11.1867, '3G', '2026-07-06 13:00:00'),
(@or, 'CMP-2026-0009', '23279200009', 'SMS_FAILURE', 'LOW', 'OPEN', 'SMS not delivering to other networks', 'SMS sent to SierraTel numbers not arriving. Started 2 days ago.', 'Western Area Urban', 'Freetown', 8.4700, -13.2350, NULL, '2026-07-05 07:30:00'),
(@st, 'CMP-2026-0010', '23230500010', 'NO_COVERAGE', 'HIGH', 'OPEN', 'No coverage along Kabala highway', 'Complete dead zone for 15km stretch between Kabala and Falaba. No operator has signal.', 'Koinadugu', 'Kabala', 9.5830, -11.5500, '2G', '2026-07-04 12:00:00'),
(@qc, 'CMP-2026-0011', '23233700011', 'SERVICE_OUTAGE', 'CRITICAL', 'OPEN', 'Qcell network down in Lungi airport area', 'No service at international airport. Travellers unable to make calls or use data.', 'Port Loko', 'Lungi', 8.6170, -13.2110, '4G', '2026-07-07 04:30:00'),
(@af, 'CMP-2026-0012', '23276100012', 'CALL_DROP', 'MEDIUM', 'RESOLVED', 'Call drops resolved after tower maintenance', 'Previously reported call drops at Aberdeen. Issue resolved after antenna realignment.', 'Western Area Urban', 'Freetown', 8.4850, -13.2650, '4G', '2026-06-28 11:00:00'),
(@or, 'CMP-2026-0013', '23279200013', 'POOR_VOICE', 'MEDIUM', 'CLOSED', 'Voice quality improved after complaint', 'Echo issue on Orange was fixed. Quality now acceptable.', 'Kenema', 'Kenema', 7.8800, -11.1900, '3G', '2026-06-25 09:15:00'),
(@st, 'CMP-2026-0014', '23230500014', 'SLOW_DATA', 'HIGH', 'OPEN', 'Data speed below 0.2 Mbps in Koidu', 'Internet nearly unusable. Speed test shows 0.15 Mbps. Multiple SierraTel users affected.', 'Kono', 'Koidu', 8.6400, -10.9800, '3G', '2026-07-06 15:30:00'),
(@af, 'CMP-2026-0015', '23276100015', 'NO_COVERAGE', 'MEDIUM', 'OPEN', 'No indoor coverage at Fourah Bay College', 'Signal drops completely inside lecture halls. Students cannot receive calls or messages.', 'Western Area Urban', 'Freetown', 8.4900, -13.2200, '4G', '2026-07-03 08:00:00');
