SET NAMES utf8mb4;
USE tnipr;

-- ── Add SLA target and response tracking to complaints ─────────────────────
-- sla_hours: target resolution time in hours per severity
-- first_response_at: when operator first acknowledged

ALTER TABLE complaints
  ADD COLUMN sla_hours INT DEFAULT NULL AFTER resolved_at,
  ADD COLUMN first_response_at DATETIME DEFAULT NULL AFTER sla_hours;

-- Set SLA targets based on severity
UPDATE complaints SET sla_hours = CASE severity
  WHEN 'CRITICAL' THEN 4
  WHEN 'HIGH'     THEN 12
  WHEN 'MEDIUM'   THEN 48
  WHEN 'LOW'      THEN 120
END;

-- Set resolved_at for RESOLVED/CLOSED complaints that don't have it
UPDATE complaints SET resolved_at = DATE_ADD(reported_at, INTERVAL FLOOR(RAND()*24 + 2) HOUR)
  WHERE status IN ('RESOLVED','CLOSED') AND resolved_at IS NULL;

-- Set first_response_at for non-OPEN complaints
UPDATE complaints SET first_response_at = DATE_ADD(reported_at, INTERVAL FLOOR(RAND()*4 + 1) HOUR)
  WHERE status NOT IN ('OPEN');

-- ── Add more historical complaints for trend analysis ──────────────────────
SET @af = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Africell%'  LIMIT 1);
SET @or = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Orange%'    LIMIT 1);
SET @st = (SELECT operator_id FROM operators WHERE operator_name LIKE '%SierraTel%' LIMIT 1);
SET @qc = (SELECT operator_id FROM operators WHERE operator_name LIKE '%Qcell%'     LIMIT 1);

INSERT INTO complaints (operator_id, reference_no, subscriber_msisdn, category, severity, status, subject, description, district, city, lat, lng, technology, reported_at, resolved_at, sla_hours, first_response_at) VALUES
-- June batch (resolved)
(@af, 'CMP-2026-0100', '23276100100', 'CALL_DROP',       'HIGH',     'RESOLVED', 'Call drops at PZ area',                'Persistent call drops near PZ roundabout.',                        'Western Area Urban', 'Freetown', 8.4650, -13.2350, '4G', '2026-06-01 09:00:00', '2026-06-01 18:00:00', 12, '2026-06-01 10:30:00'),
(@af, 'CMP-2026-0101', '23276100101', 'SLOW_DATA',       'MEDIUM',   'RESOLVED', 'Slow data at Wilberforce',             'Speed below 2 Mbps during business hours.',                        'Western Area Urban', 'Freetown', 8.4720, -13.2550, '4G', '2026-06-02 14:00:00', '2026-06-04 10:00:00', 48, '2026-06-02 17:00:00'),
(@or, 'CMP-2026-0102', '23279200102', 'NO_COVERAGE',     'HIGH',     'RESOLVED', 'No signal at Banana Islands',          'Complete coverage blackout on island.',                             'Western Area Rural', 'Freetown', 8.3100, -13.2500, '2G', '2026-06-03 08:00:00', '2026-06-04 20:00:00', 12, '2026-06-03 09:30:00'),
(@or, 'CMP-2026-0103', '23279200103', 'POOR_VOICE',      'MEDIUM',   'CLOSED',   'Echo on calls resolved',               'Voice echo was due to faulty equipment. Fixed.',                   'Bo',                 'Bo',       7.9650, -11.7350, '3G', '2026-06-04 11:00:00', '2026-06-05 16:00:00', 48, '2026-06-04 13:00:00'),
(@st, 'CMP-2026-0104', '23230500104', 'BILLING',         'LOW',      'RESOLVED', 'Double charge for airtime',            'Subscriber charged twice for same recharge.',                      'Kenema',             'Kenema',   7.8770, -11.1870, NULL, '2026-06-05 10:00:00', '2026-06-07 14:00:00', 120, '2026-06-05 14:00:00'),
(@st, 'CMP-2026-0105', '23230500105', 'SERVICE_OUTAGE',  'CRITICAL', 'RESOLVED', 'SierraTel outage in Kenema',           'Full outage lasted 5 hours. Affected all services.',               'Kenema',             'Kenema',   7.8800, -11.1850, '3G', '2026-06-06 20:00:00', '2026-06-07 01:30:00', 4,  '2026-06-06 20:30:00'),
(@qc, 'CMP-2026-0106', '23233700106', 'CALL_DROP',       'HIGH',     'RESOLVED', 'Drops at Port Loko market',            'Calls consistently dropping in market area.',                      'Port Loko',          'Port Loko', 8.7660, -12.7880, '3G', '2026-06-07 09:00:00', '2026-06-07 20:00:00', 12, '2026-06-07 10:00:00'),
(@af, 'CMP-2026-0107', '23276100107', 'SLOW_DATA',       'HIGH',     'RESOLVED', 'Data speed issue at Kissy',            'Speed dropped to 0.3 Mbps for entire Kissy area.',                 'Western Area Urban', 'Freetown', 8.4800, -13.2050, '4G', '2026-06-08 15:00:00', '2026-06-09 08:00:00', 12, '2026-06-08 16:30:00'),
(@or, 'CMP-2026-0108', '23279200108', 'SMS_FAILURE',     'LOW',      'RESOLVED', 'SMS delivery delays fixed',            'Cross-network SMS delays resolved.',                               'Western Area Urban', 'Freetown', 8.4700, -13.2400, NULL, '2026-06-09 07:00:00', '2026-06-11 10:00:00', 120, '2026-06-09 11:00:00'),
(@qc, 'CMP-2026-0109', '23233700109', 'NO_COVERAGE',     'MEDIUM',   'RESOLVED', 'Coverage gap at Bonthe',               'No signal in Bonthe town center. Fixed with new micro cell.',      'Bonthe',             'Bonthe',   7.5260, -12.5050, '2G', '2026-06-10 08:00:00', '2026-06-14 16:00:00', 48, '2026-06-10 12:00:00'),
-- Mid-June
(@af, 'CMP-2026-0110', '23276100110', 'SERVICE_OUTAGE',  'CRITICAL', 'RESOLVED', 'Africell tower failure Murray Town',   'Tower went offline. 8-hour outage.',                               'Western Area Urban', 'Freetown', 8.4670, -13.2600, '4G', '2026-06-12 02:00:00', '2026-06-12 09:00:00', 4,  '2026-06-12 02:20:00'),
(@or, 'CMP-2026-0111', '23279200111', 'CALL_DROP',       'MEDIUM',   'RESOLVED', 'Call drops at Cotton Tree',            'Intermittent call drops near landmark.',                            'Western Area Urban', 'Freetown', 8.4840, -13.2340, '4G', '2026-06-13 10:00:00', '2026-06-14 15:00:00', 48, '2026-06-13 12:00:00'),
(@st, 'CMP-2026-0112', '23230500112', 'POOR_VOICE',      'HIGH',     'RESOLVED', 'Voice quality at Mile 91',             'Garbled audio on all calls in Mile 91 area.',                      'Tonkolili',          'Mile 91',  8.4600, -12.0450, '3G', '2026-06-14 14:00:00', '2026-06-15 04:00:00', 12, '2026-06-14 15:00:00'),
(@qc, 'CMP-2026-0113', '23233700113', 'SLOW_DATA',       'MEDIUM',   'RESOLVED', 'Slow browsing at Grafton',             'Web pages taking 30+ seconds to load.',                            'Western Area Rural', 'Freetown', 8.3850, -13.1950, '4G', '2026-06-15 16:00:00', '2026-06-17 11:00:00', 48, '2026-06-15 19:00:00'),
(@af, 'CMP-2026-0114', '23276100114', 'BILLING',         'LOW',      'CLOSED',   'Airtime deduction during promo',       'Charged despite active promo. Refund issued.',                     'Bombali',            'Makeni',   8.8800, -12.0400, NULL, '2026-06-16 09:00:00', '2026-06-20 14:00:00', 120, '2026-06-16 14:00:00'),
-- Late June
(@or, 'CMP-2026-0115', '23279200115', 'SERVICE_OUTAGE',  'CRITICAL', 'RESOLVED', 'Orange outage Western Area',           'Major outage affecting 50k+ subscribers.',                         'Western Area Urban', 'Freetown', 8.4700, -13.2300, '4G', '2026-06-18 18:00:00', '2026-06-19 00:30:00', 4,  '2026-06-18 18:15:00'),
(@st, 'CMP-2026-0116', '23230500116', 'NO_COVERAGE',     'HIGH',     'RESOLVED', 'Dead zone Pujehun highway',            'No coverage for 20km stretch.',                                    'Pujehun',            'Pujehun',  7.3530, -11.7190, '2G', '2026-06-20 08:00:00', '2026-06-21 14:00:00', 12, '2026-06-20 10:00:00'),
(@qc, 'CMP-2026-0117', '23233700117', 'CALL_DROP',       'MEDIUM',   'RESOLVED', 'Drop rate high at Waterloo',           'CDR analysis showed 12% drop rate.',                               'Western Area Rural', 'Waterloo', 8.3380, -13.0500, '3G', '2026-06-21 11:00:00', '2026-06-23 09:00:00', 48, '2026-06-21 14:00:00'),
(@af, 'CMP-2026-0118', '23276100118', 'SLOW_DATA',       'HIGH',     'RESOLVED', 'Congestion at Siaka Stevens St',       'Peak-hour congestion. Throughput below 0.5 Mbps.',                 'Western Area Urban', 'Freetown', 8.4840, -13.2340, '4G', '2026-06-23 17:00:00', '2026-06-24 08:00:00', 12, '2026-06-23 18:00:00'),
(@or, 'CMP-2026-0119', '23279200119', 'POOR_VOICE',      'LOW',      'CLOSED',   'Minor voice delay fixed',              'One-way audio resolved after core update.',                        'Western Area Urban', 'Freetown', 8.4750, -13.2300, '3G', '2026-06-25 10:00:00', '2026-06-28 16:00:00', 120, '2026-06-25 15:00:00'),
-- Early July (more recent, mix of statuses)
(@st, 'CMP-2026-0120', '23230500120', 'SERVICE_OUTAGE',  'CRITICAL', 'RESOLVED', 'SierraTel Bo district outage',         'Full outage in Bo for 3 hours.',                                   'Bo',                 'Bo',       7.9640, -11.7400, '3G', '2026-07-01 06:00:00', '2026-07-01 09:30:00', 4,  '2026-07-01 06:10:00'),
(@af, 'CMP-2026-0121', '23276100121', 'CALL_DROP',       'HIGH',     'RESOLVED', 'Drop issue at Juba Bridge',            'High call drop rate during rush hour traffic.',                    'Western Area Urban', 'Freetown', 8.4550, -13.2300, '4G', '2026-07-01 18:00:00', '2026-07-02 08:00:00', 12, '2026-07-01 19:00:00'),
(@qc, 'CMP-2026-0122', '23233700122', 'NO_COVERAGE',     'MEDIUM',   'INVESTIGATING', 'Qcell gaps at Moyamba',           'Several areas in Moyamba with no Qcell signal.',                   'Moyamba',            'Moyamba',  8.1590, -12.4310, '3G', '2026-07-02 10:00:00', NULL, 48, '2026-07-02 13:00:00'),
(@or, 'CMP-2026-0123', '23279200123', 'SLOW_DATA',       'HIGH',     'INVESTIGATING', 'Orange slow at university',       'USL campus data speeds below 0.8 Mbps.',                           'Western Area Urban', 'Freetown', 8.4900, -13.2250, '4G', '2026-07-03 09:00:00', NULL, 12, '2026-07-03 10:30:00'),
(@af, 'CMP-2026-0124', '23276100124', 'BILLING',         'LOW',      'RESOLVED', 'Bundle activation failure refund',     'Auto-renewal charged but bundle not activated.',                   'Western Area Urban', 'Freetown', 8.4750, -13.2350, NULL, '2026-07-03 14:00:00', '2026-07-05 10:00:00', 120, '2026-07-03 17:00:00'),
(@st, 'CMP-2026-0125', '23230500125', 'CALL_DROP',       'MEDIUM',   'OPEN',     'Drops at Kailahun town',               'Consistent call drops in Kailahun center.',                        'Kailahun',           'Kailahun', 8.2790, -10.5720, '3G', '2026-07-04 08:00:00', NULL, 48, NULL),
(@qc, 'CMP-2026-0126', '23233700126', 'POOR_VOICE',      'HIGH',     'OPEN',     'Voice quality Kambia',                 'Severe voice distortion on Qcell network.',                        'Kambia',             'Kambia',   9.1160, -12.9160, '3G', '2026-07-05 11:00:00', NULL, 12, NULL),
(@or, 'CMP-2026-0127', '23279200127', 'SERVICE_OUTAGE',  'CRITICAL', 'ESCALATED','Orange partial outage Kono',           'Intermittent service in Kono district. Escalated to NOC.',         'Kono',               'Koidu',    8.6420, -10.9750, '3G', '2026-07-06 05:00:00', NULL, 4,  '2026-07-06 05:15:00'),
(@af, 'CMP-2026-0128', '23276100128', 'SLOW_DATA',       'MEDIUM',   'OPEN',     'Africell data slow Hastings',          'Evening congestion making data unusable.',                          'Western Area Rural', 'Freetown', 8.3700, -13.1400, '4G', '2026-07-06 19:00:00', NULL, 48, NULL),
(@st, 'CMP-2026-0129', '23230500129', 'SMS_FAILURE',     'LOW',      'OPEN',     'SierraTel SMS failures',               'SMS to international numbers failing.',                             'Western Area Urban', 'Freetown', 8.4680, -13.2380, NULL, '2026-07-07 06:00:00', NULL, 120, NULL);

-- ── AI Insights seed table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_insights (
  insight_id   INT          NOT NULL AUTO_INCREMENT,
  domain       ENUM('RAN','FIBER','CONSUMER','COMPLIANCE','CROSS_DOMAIN') NOT NULL,
  severity     ENUM('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'INFO',
  title        VARCHAR(255) NOT NULL,
  description  TEXT         NOT NULL,
  recommendation TEXT       NOT NULL,
  affected_operators VARCHAR(255) DEFAULT NULL,
  metric_key   VARCHAR(100) DEFAULT NULL,
  metric_value DECIMAL(10,2) DEFAULT NULL,
  metric_unit  VARCHAR(30)  DEFAULT NULL,
  status       ENUM('NEW','ACKNOWLEDGED','ACTIONED','DISMISSED') NOT NULL DEFAULT 'NEW',
  generated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at   DATETIME     DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (insight_id),
  KEY idx_ai_domain (domain),
  KEY idx_ai_severity (severity),
  KEY idx_ai_status (status),
  KEY idx_ai_generated (generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO ai_insights (domain, severity, title, description, recommendation, affected_operators, metric_key, metric_value, metric_unit, generated_at) VALUES
('RAN',        'CRITICAL', 'High call drop rate detected in Western Area',                'Call drop rate has exceeded 5% threshold across multiple cells in Western Area Urban district. 14 cells affected with average CDR of 6.2%. Pattern intensifies during peak hours (17:00-21:00).', 'Investigate antenna tilt and handover parameters for affected cells. Consider capacity expansion for high-traffic cells at PZ, Lumley, and Siaka Stevens areas.', 'Africell,Orange', 'call_drop_rate', 6.20, '%', '2026-07-07 06:00:00'),
('RAN',        'WARNING',  'SierraTel 3G availability below target in rural districts',   'SierraTel 3G network availability dropped to 94.2% in Koinadugu and Kailahun districts, below the 95% regulatory threshold. Trend shows gradual decline over past 3 weeks.', 'Review power supply and backhaul reliability at rural sites. Check generator fuel delivery schedules and battery backup status.', 'SierraTel', 'availability', 94.20, '%', '2026-07-07 05:00:00'),
('FIBER',      'WARNING',  'Fiber utilization approaching capacity on Freetown backbone', 'Freetown-Bo backbone fiber link utilization has reached 82%, up from 68% last month. At current growth rate, capacity will be exhausted within 60 days.', 'Plan capacity upgrade for Freetown-Bo trunk. Consider wavelength addition or new fiber route via Moyamba for redundancy.', 'Orange,SierraTel', 'fiber_utilization', 82.00, '%', '2026-07-07 04:00:00'),
('FIBER',      'CRITICAL', 'Repeated fiber cuts on Makeni-Kabala route',                  '3 fiber cut incidents in past 30 days on Makeni-Kabala route. Average MTTR of 18 hours. Root cause: road construction along A2 highway.', 'Coordinate with Sierra Leone Roads Authority for route protection. Install concrete duct protection in construction zones. Consider aerial rerouting for vulnerable segments.', 'Africell,Qcell', 'fiber_cuts_30d', 3.00, 'count', '2026-07-06 22:00:00'),
('CONSUMER',   'WARNING',  'Complaint volume spike — 40% increase this week',             'Consumer complaints increased by 40% week-over-week. Highest categories: CALL_DROP (35%), SERVICE_OUTAGE (25%), SLOW_DATA (20%). Western Area Urban accounts for 60% of all new complaints.', 'Prioritize network optimization in Freetown. Dispatch field teams to high-complaint areas. Issue public advisory if outage is widespread.', 'Africell,Orange,Qcell', 'complaint_volume_wow', 40.00, '%', '2026-07-07 07:00:00'),
('CONSUMER',   'CRITICAL', 'SLA breach risk — 5 complaints exceeding resolution deadline','5 complaints are within 2 hours of their SLA breach deadline. 2 are CRITICAL severity (4-hour SLA). Operators have not provided resolution updates.', 'Immediately escalate to operator NOCs. Invoke penalty clause if SLA breach occurs. Prepare compliance notice for affected operators.', 'Orange,SierraTel', 'sla_breach_risk', 5.00, 'count', '2026-07-07 08:00:00'),
('COMPLIANCE', 'WARNING',  'Qcell compliance score declining — 3-month downward trend',   'Qcell overall compliance score has dropped from 78.5% to 71.2% over 3 months. Weakest domains: CONSUMER (65%) and RAN (69%). 4 KPIs consistently failing.', 'Schedule compliance review meeting with Qcell management. Request corrective action plan within 14 days per regulation 2024/QoS/7.', 'Qcell', 'compliance_score', 71.20, '%', '2026-07-07 03:00:00'),
('COMPLIANCE', 'INFO',     'Orange leads Q2 compliance — strong improvement trend',        'Orange achieved highest compliance score (92.3%) for June 2026. Improvement of 4.2 points from previous quarter. All 5 domains above 85% threshold.', 'Acknowledge strong performance. Consider for regulatory incentive under Quality Excellence Program. Share as benchmark for other operators.', 'Orange', 'compliance_score', 92.30, '%', '2026-07-07 02:00:00'),
('CROSS_DOMAIN','CRITICAL','Correlated outage — fiber cut causing RAN and consumer impact','Fiber cut on Freetown-Waterloo route is causing cascading failures: 12 RAN sites without backhaul, 3 service outage complaints filed in past 2 hours, consumer QoE scores dropping in affected area.', 'Treat as P1 incident. Coordinate fiber repair with RAN team for site recovery sequencing. Proactively notify affected subscribers. Document for regulatory incident report.', 'Orange', 'cascading_impact', 12.00, 'sites', '2026-07-07 09:00:00'),
('CROSS_DOMAIN','WARNING', 'Data demand growth outpacing network investment',              'Aggregate data traffic grew 28% YoY while network capacity expanded only 12%. Current trajectory suggests congestion episodes will double by Q4 2026. Freetown and Bo most affected.', 'Issue industry advisory on infrastructure investment requirements. Consider spectrum refarming options. Review universal access fund allocation for capacity projects.', 'Africell,Orange,Qcell,SierraTel', 'traffic_growth_gap', 16.00, '%', '2026-07-06 18:00:00');
