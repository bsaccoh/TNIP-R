-- ===========================================================================
-- TNIP-R KPI PM Seed -- vendor-specific formulas from PM KPI reference sheet
-- Vendors: Huawei (vendor_id=1), Ericsson (vendor_id=2)
-- Technologies: 2G=1, 3G=2, 4G=3
-- Idempotent: INSERT IGNORE throughout. Run after seed.sql.
-- ===========================================================================
SET NAMES utf8mb4;
USE tnipr;

-- ---------------------------------------------------------------------------
-- 1. Additional KPI definitions (IDs 9-19; seed.sql already uses 1-8)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO kpi_definitions (kpi_id, kpi_key, name, category, unit, direction, description) VALUES
 (9,  'CALL_SUCCESS_RATE',         'Call Success Rate',                   'Accessibility',  '%',    'HIGHER_BETTER', 'End-to-end call success (setup × retain)'),
 (10, 'VOICE_CALL_SETUP_SSR',      'Voice Call Setup Success Rate',       'Accessibility',  '%',    'HIGHER_BETTER', '3G RRC + RAB voice setup success'),
 (11, 'VOICE_CALL_SSR',            'Voice Call Success Rate',             'Accessibility',  '%',    'HIGHER_BETTER', '3G voice call end-to-end success'),
 (12, 'VOICE_CALL_DROP_RATE',      'Voice Call Drop Rate',                'Retainability',  '%',    'LOWER_BETTER',  '3G abnormal voice RAB release ratio'),
 (13, 'DATA_ACCESS_SSR',           'Data Access Success Rate',            'Accessibility',  '%',    'HIGHER_BETTER', '3G RRC + PS-RAB data setup success'),
 (14, 'DATA_DROP_RATE_3G',         'Data Drop Rate (3G)',                 'Retainability',  '%',    'LOWER_BETTER',  '3G PS-RAB abnormal release ratio'),
 (15, 'DL_HS_THROUGHPUT',          'DL HS Throughput',                    'Quality',        'kbps', 'HIGHER_BETTER', '3G mean HSDPA downlink channel throughput'),
 (16, 'DATA_SERVICE_ACCESS_SSR',   'Data Service Access Success Rate',    'Accessibility',  '%',    'HIGHER_BETTER', '4G RRC × S1 × E-RAB composite setup success'),
 (17, 'DATA_SERVICE_DROP_RATE',    'Data Service Drop Rate',              'Retainability',  '%',    'LOWER_BETTER',  '4G E-RAB abnormal release ratio'),
 (18, 'DL_SPEED_MBPS',             'DL Speed',                            'Quality',        'Mbps', 'HIGHER_BETTER', '4G average downlink user throughput'),
 (19, 'UL_SPEED_MBPS',             'UL Speed',                            'Quality',        'Mbps', 'HIGHER_BETTER', '4G average uplink user throughput');

-- ---------------------------------------------------------------------------
-- 2. Counter definitions — Huawei 2G (vendor_id=1, technology_id=1)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO counter_definitions
  (vendor_id, technology_id, counter_key, counter_name, category, measurement_object, aggregation, status)
VALUES
 (1,1,'capture_duration',   'Measurement Capture Duration (s)',     'Administrative', 'CELL', 'SUM', 'MAPPED'),
 (1,1,'R373',               'Number of Unavailable Time Units',     'Availability',   'CELL', 'SUM', 'MAPPED'),
 (1,1,'K3000',              'SDCCH Setup Attempts',                 'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,1,'K3003',              'SDCCH Setup Successes',                'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,1,'CM30',               'SDCCH Congestions',                    'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,1,'K3020',              'TCH Assignment Attempts (full rate)',  'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,1,'K3010A',             'TCH Assignment Attempts (half A)',     'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,1,'K3010B',             'TCH Assignment Attempts (half B)',     'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,1,'K3023',              'TCH Assignment Successes (full rate)', 'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,1,'K3013A',             'TCH Assignment Successes (half A)',    'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,1,'K3013B',             'TCH Assignment Successes (half B)',    'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,1,'K3022',              'TCH Drops (full rate)',                'Retainability',  'CELL', 'SUM', 'MAPPED'),
 (1,1,'K3012A',             'TCH Drops (half rate A)',              'Retainability',  'CELL', 'SUM', 'MAPPED'),
 (1,1,'K3012B',             'TCH Drops (half rate B)',              'Retainability',  'CELL', 'SUM', 'MAPPED');

-- ---------------------------------------------------------------------------
-- 3. Counter definitions — Huawei 3G (vendor_id=1, technology_id=2)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO counter_definitions
  (vendor_id, technology_id, counter_key, counter_name, category, measurement_object, aggregation, status)
VALUES
 (1,2,'capture_duration',                  'Measurement Capture Duration (s)',           'Administrative', 'CELL',     'SUM', 'MAPPED'),
 (1,2,'VS_Cell_UnavailTime_OM',            'Cell Unavailable Time — O&M',                'Availability',   'CELL',     'SUM', 'MAPPED'),
 (1,2,'VS_Cell_UnavailTime_Sys',           'Cell Unavailable Time — System',             'Availability',   'CELL',     'SUM', 'MAPPED'),
 -- Voice RRC
 (1,2,'RRC_AttConnEstab_OrgConvCall',      'RRC Conn Estab Att — Orig Conv',             'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_AttConnEstab_TmConvCall',       'RRC Conn Estab Att — Term Conv',             'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_AttConnEstab_EmgCall',          'RRC Conn Estab Att — Emergency',             'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_OgConvCall',      'RRC Conn Estab Succ — Orig Conv',            'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_TmConvCall',      'RRC Conn Estab Succ — Term Conv',            'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_EmgCall',         'RRC Conn Estab Succ — Emergency',            'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 -- Voice RAB
 (1,2,'VS_RAB_AttEstabCS_Conv',            'CS RAB Setup Att — Conv',                    'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_AttEstabCS_Str',             'CS RAB Setup Att — Streaming',               'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_HSPA_RAB_AttEstab_CS_Conv',      'HSPA CS RAB Setup Att — Conv',               'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_AttEstab_AMR',               'CS RAB Setup Att — AMR',                     'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_AttEstabCS_AMRWB',           'CS RAB Setup Att — AMRWB',                   'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_SuccEstabCS_Conv',           'CS RAB Setup Succ — Conv',                   'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_SuccEstabCS_Str',            'CS RAB Setup Succ — Streaming',              'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_HSPA_RAB_SuccEstab_CS_Conv',     'HSPA CS RAB Setup Succ — Conv',              'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_SuccEstab_AMR',              'CS RAB Setup Succ — AMR',                    'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_SuccEstab_AMRWB',            'CS RAB Setup Succ — AMRWB',                  'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 -- Voice Call Success RRC extras
 (1,2,'RRC_AttConnEstab_CallReEst',        'RRC Conn Estab Att — Re-establishment',      'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_AttConnEstab_OgSubCall',        'RRC Conn Estab Att — Orig Sub',              'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_AttConnEstab_OrgConvCall',      'RRC Conn Estab Att — Orig Conv',             'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_AttConnEstab_TmConvCall',       'RRC Conn Estab Att — Term Conv',             'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_AttConnEstab_Unknown',          'RRC Conn Estab Att — Unknown',               'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_CallReEst',       'RRC Conn Estab Succ — Re-establishment',     'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_OrgSubCall',      'RRC Conn Estab Succ — Orig Sub',             'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_Unkown',          'RRC Conn Estab Succ — Unknown',              'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 -- Voice Drop
 (1,2,'VS_RAB_Loss_CS_AMR',               'CS RAB Abnormal Loss — AMR',                 'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_AbnormRel_AMRWB',           'CS RAB Abnormal Release — AMRWB',            'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_AbnormRel_CS_HSPA_Conv',    'CS HSPA RAB Abnormal Release — Conv',        'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_Loss_CS_Norm',              'CS RAB Normal Release — AMR',                'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_NormRel_CS_HSPA_Conv',      'CS HSPA RAB Normal Release — Conv',          'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_NormRel_AMRWB',             'CS RAB Normal Release — AMRWB',              'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 -- Data RRC
 (1,2,'RRC_AttConnEstab_OrgInterCall',    'RRC Conn Estab Att — Orig Interactive',      'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_AttConnEstab_TmInterCall',     'RRC Conn Estab Att — Term Interactive',      'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_AttConnEstab_TmBkgCall',       'RRC Conn Estab Att — Term Background',       'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_AttConnEstab_OrgBkgCall',      'RRC Conn Estab Att — Orig Background',       'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_AttConnEstab_OrgStrCall',      'RRC Conn Estab Att — Orig Streaming',        'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_AttConnEstab_TmStrCall',       'RRC Conn Estab Att — Term Streaming',        'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RRC_AttConnEstab_EDCH',         'RRC Conn Estab Att — E-DCH',                 'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RRC_AttConnEstab_HSDSCH',       'RRC Conn Estab Att — HS-DSCH',              'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_OrgItrCall',     'RRC Conn Estab Succ — Orig Interactive',     'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_TmItrCall',      'RRC Conn Estab Succ — Term Interactive',     'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_OrgBkgCall',     'RRC Conn Estab Succ — Orig Background',      'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_TmBkgCall',      'RRC Conn Estab Succ — Term Background',      'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_OrgSubCall',     'RRC Conn Estab Succ — Orig Sub',             'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_OrgStrCall',     'RRC Conn Estab Succ — Orig Streaming',       'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'RRC_SuccConnEstab_TmStrCall',      'RRC Conn Estab Succ — Term Streaming',       'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RRC_SuccConnEstab_EDCH',        'RRC Conn Estab Succ — E-DCH',                'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RRC_SuccConnEstab_HSDSCH',      'RRC Conn Estab Succ — HS-DSCH',             'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 -- Data PS-RAB
 (1,2,'VS_RAB_AttEstabPS_Conv',           'PS RAB Setup Att — Conv',                    'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_AttEstabPS_Str',            'PS RAB Setup Att — Streaming',               'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_AttEstabPS_Inter',          'PS RAB Setup Att — Interactive',             'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_AttEstabPS_Bkg',            'PS RAB Setup Att — Background',              'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_SuccEstabPS_Conv',          'PS RAB Setup Succ — Conv',                   'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_SuccEstabPS_Str',           'PS RAB Setup Succ — Streaming',              'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_SuccEstabPS_Inter',         'PS RAB Setup Succ — Interactive',            'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_SuccEstabPS_Bkg',           'PS RAB Setup Succ — Background',             'Accessibility',  'ULOCELL',  'SUM', 'MAPPED'),
 -- Data Drop
 (1,2,'VS_RAB_Loss_PS_Abnorm',            'PS RAB Abnormal Loss',                       'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_AbnormRel_PS_PCH',          'PS RAB Abnormal Release — PCH',              'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_AbnormRel_PS_D2P',          'PS RAB Abnormal Release — D2P',              'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_AbnormRel_PS_F2P',          'PS RAB Abnormal Release — F2P',              'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_Loss_PS_Norm',              'PS RAB Normal Release',                      'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_RAB_NormRel_PS_PCH',            'PS RAB Normal Release — PCH',                'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_DCCC_D2P_Succ',                 'DCCC D2P Success',                           'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 (1,2,'VS_DCCC_FtoP_Succ',                'DCCC F2P Success',                           'Retainability',  'ULOCELL',  'SUM', 'MAPPED'),
 -- DL HS Throughput
 (1,2,'VS_HSDPA_MeanChThroughput',        'HSDPA Mean Channel Throughput (kbps)',       'Quality',        'HSDSCH',   'AVG', 'MAPPED');

-- ---------------------------------------------------------------------------
-- 4. Counter definitions — Huawei 4G PM-style (vendor_id=1, technology_id=3)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO counter_definitions
  (vendor_id, technology_id, counter_key, counter_name, category, measurement_object, aggregation, status)
VALUES
 (1,3,'capture_duration',                    'Measurement Capture Duration (s)',        'Administrative', 'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_Cell_Avail_Dur',                    'Cell Available Duration (s)',             'Availability',   'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_RRC_CONNREQ_SUCC',                  'RRC Connection Request Success',          'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_RRC_CONNREQ_ATT',                   'RRC Connection Request Attempts',         'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_S1SIG_CONNEST_SUCC',               'S1 Signalling Connection Setup Success',  'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_S1SIG_CONNEST_ATT',                'S1 Signalling Connection Setup Attempts', 'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_E_RAB_SUCCEST',                    'E-RAB Setup Success',                     'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_E_RAB_ATTEST',                     'E-RAB Setup Attempts',                    'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_E_RAB_ABNORMREL',                  'E-RAB Abnormal Release',                  'Retainability',  'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_E_RAB_NORMREL',                    'E-RAB Normal Release',                    'Retainability',  'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_THRP_BITS_DL',                     'Downlink Throughput Volume (bits)',        'Quality',        'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_Thrp_Time_Cell_DL_HighPrecision',  'DL Scheduling Time — High Precision (ms)','Quality',        'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_THRP_BITS_UL',                     'Uplink Throughput Volume (bits)',          'Quality',        'CELL', 'SUM', 'MAPPED'),
 (1,3,'L_Thrp_Time_Cell_UL_HighPrecision',  'UL Scheduling Time — High Precision (ms)','Quality',        'CELL', 'SUM', 'MAPPED');

-- ---------------------------------------------------------------------------
-- 5. Counter definitions — Ericsson 2G (vendor_id=2, technology_id=1)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO counter_definitions
  (vendor_id, technology_id, counter_key, counter_name, category, measurement_object, aggregation, status)
VALUES
 (2,1,'DOWNTIME_BDWNACC',           'Cell Downtime — Blocked Access',          'Availability',  'CELL', 'SUM', 'MAPPED'),
 (2,1,'DOWNTIME_TDWNSCAN',          'Total Downtime Scan Interval',            'Availability',  'CELL', 'SUM', 'MAPPED'),
 (2,1,'CLSDCCH_CCONGS',             'SDCCH Congestions',                       'Accessibility', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CLSDCCH_CCALLS',             'SDCCH Call Attempts',                     'Accessibility', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CLSDCCH_CNDROP',             'SDCCH Drop Count',                        'Accessibility', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CLSDCCH_CNRELCONG',          'SDCCH Release due to Congestion',         'Accessibility', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CLSDCCH_CMSESTAB',           'SDCCH Establishments',                    'Accessibility', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CLTCH_TCASSALL',             'TCH Assignments — All',                   'Accessibility', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CLTCH_TASSALL',              'TCH Assignment Attempts — All',           'Accessibility', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CELTCHF_TFNCEDROP',          'TCH Full Rate — Non-call-end Drop',       'Retainability', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CELTCHH_THNCEDROP',          'TCH Half Rate — Non-call-end Drop',       'Retainability', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CELTCHF_TFNCEDROPSUB',       'TCH Full Rate Sub — Non-call-end Drop',   'Retainability', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CELTCHH_THNCEDROPSUB',       'TCH Half Rate Sub — Non-call-end Drop',   'Retainability', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CELTCHF_TFCASSALL',          'TCH Full Rate Assignment Successes',      'Retainability', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CELTCHF_TFCASSALLSUB',       'TCH Full Rate Sub Assignment Successes',  'Retainability', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CELTCHH_THCASSALL',          'TCH Half Rate Assignment Successes',      'Retainability', 'CELL', 'SUM', 'MAPPED'),
 (2,1,'CELTCHH_THCASSALLSUB',       'TCH Half Rate Sub Assignment Successes',  'Retainability', 'CELL', 'SUM', 'MAPPED');

-- ---------------------------------------------------------------------------
-- 6. Counter definitions — Ericsson 3G (vendor_id=2, technology_id=2)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO counter_definitions
  (vendor_id, technology_id, counter_key, counter_name, category, measurement_object, aggregation, status)
VALUES
 (2,2,'capture_duration_expected',              'Expected Measurement Duration (s)',              'Administrative', 'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmCellDowntimeAuto',            'Cell Downtime — Automatic',                      'Availability',   'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmCellDowntimeMan',             'Cell Downtime — Manual',                         'Availability',   'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmTotNoRrcConnectReqCsSucc',    'Total RRC Connect Req CS Succ',                  'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmTotNoRrcConnectReqCs',        'Total RRC Connect Req CS Att',                   'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmNoRabEstablishSuccessSpeech', 'RAB Establish Success — Speech',                 'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmNoRabEstablishAttemptSpeech', 'RAB Establish Attempt — Speech',                 'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmNoDirRetryAtt',               'Direct Retry Attempts',                          'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmNoNormalRabReleaseSpeech',    'RAB Normal Release — Speech',                    'Retainability',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmNoSystemRabReleaseSpeech',    'RAB System Release — Speech',                    'Retainability',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'pmTotNoRrcConnectReqPsSucc',              'Total RRC Connect Req PS Succ',                  'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'pmTotNoRrcConnectReqPs',                  'Total RRC Connect Req PS Att',                   'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'pmNoLoadSharingRrcConnPs',                'RRC Conn PS Load Sharing',                       'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'pmNoNormalNasSignReleasePs',              'NAS Signalling Normal Release PS',               'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'pmNoSystemNasSignReleasePs',              'NAS Signalling System Release PS',               'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'pmNoRabEstablishAttemptPacketInteractive','RAB Establish Attempt — Packet Interactive',     'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'pmNoRabEstablishSuccessPacketInteractive','RAB Establish Success — Packet Interactive',     'Accessibility',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmNoSystemRbReleaseHs',         'RB System Release HS',                           'Retainability',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmNoNormalRbReleaseHs',         'RB Normal Release HS',                           'Retainability',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmChSwitchSuccHsUra',           'Channel Switch Success HS URA',                  'Retainability',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmNoSuccRbReconfPsIntDch',      'Successful RB Reconfig PS Interactive DCH',     'Retainability',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'UtranCell_pmPsIntHsToFachSucc',           'PS Interactive HS to FACH Success',              'Retainability',  'CELL',     'SUM', 'MAPPED'),
 (2,2,'Hsdsch_pmSumHsDlRlcUserPacketThp',        'Sum HS DL RLC User Packet Throughput',           'Quality',        'HSDSCH',   'SUM', 'MAPPED'),
 (2,2,'Hsdsch_pmSamplesHsDlRlcUserPacketThp',    'Samples HS DL RLC User Packet Throughput',       'Quality',        'HSDSCH',   'SUM', 'MAPPED');

-- ---------------------------------------------------------------------------
-- 7. Counter definitions — Ericsson 4G (vendor_id=2, technology_id=3)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO counter_definitions
  (vendor_id, technology_id, counter_key, counter_name, category, measurement_object, aggregation, status)
VALUES
 (2,3,'capture_duration',                'Measurement Capture Duration (s)',          'Administrative', 'CELL', 'SUM', 'MAPPED'),
 (2,3,'L_Cell_Avail_Dur',                'Cell Available Duration (s)',               'Availability',   'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmRrcConnEstabSucc',              'RRC Conn Estab Success',                    'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmRrcConnEstabAtt',               'RRC Conn Estab Attempts',                   'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmRrcConnEstabAttReatt',          'RRC Conn Estab Re-attempts',                'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmRrcConnEstabFailMmeOvlMod',     'RRC Conn Estab Fail — MME Overload (Mod)',  'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmRrcConnEstabFailMmeOvlMos',     'RRC Conn Estab Fail — MME Overload (Mos)',  'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmS1SigConnEstabSucc',            'S1 Sig Conn Estab Success',                 'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmS1SigConnEstabAtt',             'S1 Sig Conn Estab Attempts',                'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmS1SigConnEstabFailMmeOvlMos',   'S1 Sig Conn Estab Fail — MME Overload',    'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmErabEstabSuccInit',             'E-RAB Setup Success — Initial',             'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmErabEstabAttInit',              'E-RAB Setup Attempts — Initial',            'Accessibility',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmErabRelAbnormalEnbAct',         'E-RAB Abnormal Release — eNB Active',       'Retainability',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmErabRelAbnormalMmeAct',         'E-RAB Abnormal Release — MME Active',       'Retainability',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmErabRelAbnormalEnb',            'E-RAB Abnormal Release — eNB',              'Retainability',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmErabRelNormalEnb',              'E-RAB Normal Release — eNB',                'Retainability',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmErabRelMme',                    'E-RAB Release — MME',                       'Retainability',  'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmPdcpVolDlDrb',                  'PDCP DL Data Volume DRB (kbits)',            'Quality',        'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmSchedActivityCellDl',           'DL Scheduling Activity (ms)',               'Quality',        'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmPdcpVolUlDrb',                  'PDCP UL Data Volume DRB (kbits)',            'Quality',        'CELL', 'SUM', 'MAPPED'),
 (2,3,'pmSchedActivityCellUl',           'UL Scheduling Activity (ms)',               'Quality',        'CELL', 'SUM', 'MAPPED');

-- ---------------------------------------------------------------------------
-- 8. KPI formulas — Huawei 2G (vendor_id=1, technology_id=1)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO kpi_formulas (kpi_id, vendor_id, technology_id, operator_id, expression, is_active) VALUES
 -- Cell Availability
 (5, 1,1,NULL,
  '100*(1-({R373}/{capture_duration}))',
  1),
 -- Call Setup Success Rate
 (3, 1,1,NULL,
  '{K3003}/{K3000}*(1-{CM30}/{K3003})*({K3023}+{K3013A}+{K3013B})/({K3020}+{K3010A}+{K3010B})*100',
  1),
 -- Call Success Rate
 (9, 1,1,NULL,
  '{K3003}/{K3000}*(1-{CM30}/{K3003})*(({K3023}+{K3013A}+{K3013B})/({K3020}+{K3010A}+{K3010B}))*(1-({K3022}+{K3012A}+{K3012B})/({K3023}+{K3013A}+{K3013B}))*100',
  1),
 -- Call Drop Rate
 (4, 1,1,NULL,
  '({K3022}+{K3012A}+{K3012B})/({K3023}+{K3013A}+{K3013B})*100',
  1);

-- ---------------------------------------------------------------------------
-- 9. KPI formulas — Huawei 3G (vendor_id=1, technology_id=2)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO kpi_formulas (kpi_id, vendor_id, technology_id, operator_id, expression, is_active) VALUES
 -- Cell Availability
 (5, 1,2,NULL,
  '100*({capture_duration}-{VS_Cell_UnavailTime_OM}-COALESCE({VS_Cell_UnavailTime_Sys},0))/{capture_duration}',
  1),
 -- Voice Call Setup Success Rate
 (10,1,2,NULL,
  '100*({RRC_SuccConnEstab_OgConvCall}+{RRC_SuccConnEstab_TmConvCall}+{RRC_SuccConnEstab_EmgCall})/({RRC_AttConnEstab_OrgConvCall}+{RRC_AttConnEstab_TmConvCall}+{RRC_AttConnEstab_EmgCall})*({VS_RAB_SuccEstabCS_Conv}+{VS_RAB_SuccEstabCS_Str}+COALESCE({VS_HSPA_RAB_SuccEstab_CS_Conv},0)+{VS_RAB_SuccEstab_AMRWB}+{VS_RAB_SuccEstab_AMR})/({VS_RAB_AttEstabCS_Conv}+{VS_RAB_AttEstabCS_Str}+COALESCE({VS_HSPA_RAB_AttEstab_CS_Conv},0)+{VS_RAB_AttEstab_AMR}+{VS_RAB_AttEstabCS_AMRWB})',
  1),
 -- Voice Call Success Rate
 (11,1,2,NULL,
  '100*({RRC_SuccConnEstab_CallReEst}+{RRC_SuccConnEstab_EmgCall}+{RRC_SuccConnEstab_OgConvCall}+{RRC_SuccConnEstab_OrgSubCall}+{RRC_SuccConnEstab_TmConvCall}+{RRC_SuccConnEstab_Unkown})/({RRC_AttConnEstab_CallReEst}+{RRC_AttConnEstab_EmgCall}+{RRC_AttConnEstab_OgSubCall}+{RRC_AttConnEstab_OrgConvCall}+{RRC_AttConnEstab_TmConvCall}+{RRC_AttConnEstab_Unknown})*({VS_HSPA_RAB_SuccEstab_CS_Conv}+{VS_RAB_SuccEstabCS_Conv}+{VS_RAB_SuccEstabCS_Str}+{VS_RAB_SuccEstab_AMR}+{VS_RAB_SuccEstab_AMRWB})/({VS_HSPA_RAB_AttEstab_CS_Conv}+{VS_RAB_AttEstabCS_Conv}+{VS_RAB_AttEstabCS_Str}+{VS_RAB_AttEstab_AMR}+COALESCE({VS_RAB_AttEstabCS_AMRWB},0))*(1-({VS_RAB_Loss_CS_AMR}+COALESCE({VS_RAB_AbnormRel_AMRWB},0)+COALESCE({VS_RAB_AbnormRel_CS_HSPA_Conv},0))/({VS_RAB_Loss_CS_AMR}+COALESCE({VS_RAB_AbnormRel_AMRWB},0)+COALESCE({VS_RAB_AbnormRel_CS_HSPA_Conv},0)+{VS_RAB_Loss_CS_Norm}+{VS_RAB_NormRel_CS_HSPA_Conv}+COALESCE({VS_RAB_NormRel_AMRWB},0)))',
  1),
 -- Voice Call Drop Rate
 (12,1,2,NULL,
  '100*({VS_RAB_Loss_CS_AMR}+COALESCE({VS_RAB_AbnormRel_AMRWB},0)+COALESCE({VS_RAB_AbnormRel_CS_HSPA_Conv},0))/(COALESCE({VS_HSPA_RAB_SuccEstab_CS_Conv},0)+{VS_RAB_SuccEstab_AMRWB}+{VS_RAB_SuccEstab_AMR})',
  1),
 -- Data Access Success Rate
 (13,1,2,NULL,
  '100*({RRC_SuccConnEstab_OrgItrCall}+{RRC_SuccConnEstab_TmItrCall}+{RRC_SuccConnEstab_OrgBkgCall}+{RRC_SuccConnEstab_TmBkgCall}+{RRC_SuccConnEstab_OrgSubCall}+{RRC_SuccConnEstab_OrgStrCall}+{RRC_SuccConnEstab_TmStrCall}+COALESCE({VS_RRC_SuccConnEstab_EDCH},0)+COALESCE({VS_RRC_SuccConnEstab_HSDSCH},0))/({RRC_AttConnEstab_OrgInterCall}+{RRC_AttConnEstab_TmInterCall}+{RRC_AttConnEstab_TmBkgCall}+{RRC_AttConnEstab_OrgBkgCall}+{RRC_AttConnEstab_OgSubCall}+{RRC_AttConnEstab_OrgStrCall}+{RRC_AttConnEstab_TmStrCall}+COALESCE({VS_RRC_AttConnEstab_EDCH},0)+COALESCE({VS_RRC_AttConnEstab_HSDSCH},0))*({VS_RAB_SuccEstabPS_Conv}+{VS_RAB_SuccEstabPS_Str}+{VS_RAB_SuccEstabPS_Inter}+{VS_RAB_SuccEstabPS_Bkg})/({VS_RAB_AttEstabPS_Conv}+{VS_RAB_AttEstabPS_Str}+{VS_RAB_AttEstabPS_Inter}+{VS_RAB_AttEstabPS_Bkg})',
  1),
 -- Data Drop Rate
 (14,1,2,NULL,
  '100*({VS_RAB_Loss_PS_Abnorm}-{VS_RAB_AbnormRel_PS_PCH}-{VS_RAB_AbnormRel_PS_D2P}-{VS_RAB_AbnormRel_PS_F2P})/({VS_RAB_Loss_PS_Abnorm}+{VS_RAB_Loss_PS_Norm}-{VS_RAB_AbnormRel_PS_PCH}-{VS_RAB_NormRel_PS_PCH}+{VS_DCCC_D2P_Succ}+{VS_DCCC_FtoP_Succ})',
  1),
 -- DL HS Throughput
 (15,1,2,NULL,
  '{VS_HSDPA_MeanChThroughput}',
  1);

-- ---------------------------------------------------------------------------
-- 10. KPI formulas — Huawei 4G (vendor_id=1, technology_id=3)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO kpi_formulas (kpi_id, vendor_id, technology_id, operator_id, expression, is_active) VALUES
 -- Cell Availability
 (5, 1,3,NULL,
  '100*({L_Cell_Avail_Dur}/{capture_duration})',
  1),
 -- Data Service Access Success Rate
 (16,1,3,NULL,
  '100*({L_RRC_CONNREQ_SUCC}/{L_RRC_CONNREQ_ATT})*({L_S1SIG_CONNEST_SUCC}/{L_S1SIG_CONNEST_ATT})*({L_E_RAB_SUCCEST}/{L_E_RAB_ATTEST})',
  1),
 -- Data Service Drop Rate
 (17,1,3,NULL,
  '100*({L_E_RAB_ABNORMREL}/({L_E_RAB_ABNORMREL}+{L_E_RAB_NORMREL}))',
  1),
 -- DL Speed (Mbps)
 (18,1,3,NULL,
  '({L_THRP_BITS_DL}/{L_Thrp_Time_Cell_DL_HighPrecision})/1000',
  1),
 -- UL Speed (Mbps)
 (19,1,3,NULL,
  '({L_THRP_BITS_UL}/{L_Thrp_Time_Cell_UL_HighPrecision})/1000',
  1);

-- ---------------------------------------------------------------------------
-- 11. KPI formulas — Ericsson 2G (vendor_id=2, technology_id=1)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO kpi_formulas (kpi_id, vendor_id, technology_id, operator_id, expression, is_active) VALUES
 -- Cell Availability
 (5, 2,1,NULL,
  '100*(1-({DOWNTIME_BDWNACC}/{DOWNTIME_TDWNSCAN}))',
  1),
 -- Call Setup Success Rate
 (3, 2,1,NULL,
  '100*(1-({CLSDCCH_CCONGS}/{CLSDCCH_CCALLS}))*(1-(({CLSDCCH_CNDROP}-{CLSDCCH_CNRELCONG})/{CLSDCCH_CMSESTAB}))*({CLTCH_TCASSALL}/{CLTCH_TASSALL})',
  1),
 -- Call Success Rate
 (9, 2,1,NULL,
  '100*(1-({CLSDCCH_CCONGS}/{CLSDCCH_CCALLS}))*(1-(({CLSDCCH_CNDROP}-{CLSDCCH_CNRELCONG})/{CLSDCCH_CMSESTAB}))*({CLTCH_TCASSALL}/{CLTCH_TASSALL})*(1-(({CELTCHF_TFNCEDROP}+{CELTCHH_THNCEDROP}+{CELTCHF_TFNCEDROPSUB}+{CELTCHH_THNCEDROPSUB})/({CELTCHF_TFCASSALL}+{CELTCHH_THCASSALL}+{CELTCHF_TFCASSALLSUB}+{CELTCHH_THCASSALLSUB})))',
  1),
 -- Call Drop Rate
 (4, 2,1,NULL,
  '100*({CELTCHF_TFNCEDROP}+{CELTCHH_THNCEDROP}+{CELTCHF_TFNCEDROPSUB}+{CELTCHH_THNCEDROPSUB})/({CELTCHF_TFCASSALL}+{CELTCHF_TFCASSALLSUB}+{CELTCHH_THCASSALL}+{CELTCHH_THCASSALLSUB})',
  1);

-- ---------------------------------------------------------------------------
-- 12. KPI formulas — Ericsson 3G (vendor_id=2, technology_id=2)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO kpi_formulas (kpi_id, vendor_id, technology_id, operator_id, expression, is_active) VALUES
 -- Cell Availability
 (5, 2,2,NULL,
  '100*({capture_duration_expected}-{UtranCell_pmCellDowntimeAuto}-{UtranCell_pmCellDowntimeMan})/{capture_duration_expected}',
  1),
 -- Voice Call Setup Success Rate
 (10,2,2,NULL,
  '({UtranCell_pmTotNoRrcConnectReqCsSucc}/{UtranCell_pmTotNoRrcConnectReqCs})*({UtranCell_pmNoRabEstablishSuccessSpeech}/({UtranCell_pmNoRabEstablishAttemptSpeech}-{UtranCell_pmNoDirRetryAtt}))*100',
  1),
 -- Voice Call Success Rate
 (11,2,2,NULL,
  '({UtranCell_pmTotNoRrcConnectReqCsSucc}/{UtranCell_pmTotNoRrcConnectReqCs})*({UtranCell_pmNoRabEstablishSuccessSpeech}/({UtranCell_pmNoRabEstablishAttemptSpeech}-{UtranCell_pmNoDirRetryAtt}))*({UtranCell_pmNoNormalRabReleaseSpeech}/({UtranCell_pmNoNormalRabReleaseSpeech}+{UtranCell_pmNoSystemRabReleaseSpeech}))*100',
  1),
 -- Voice Call Drop Rate
 (12,2,2,NULL,
  '({UtranCell_pmNoSystemRabReleaseSpeech}/({UtranCell_pmNoNormalRabReleaseSpeech}+{UtranCell_pmNoSystemRabReleaseSpeech}))*100',
  1),
 -- Data Access Success Rate
 (13,2,2,NULL,
  '({pmTotNoRrcConnectReqPsSucc}/({pmTotNoRrcConnectReqPs}-{pmNoLoadSharingRrcConnPs}))*(({pmNoNormalNasSignReleasePs}+{pmNoRabEstablishAttemptPacketInteractive})/({pmNoNormalNasSignReleasePs}+{pmNoSystemNasSignReleasePs}+{pmNoRabEstablishAttemptPacketInteractive}))*({pmNoRabEstablishSuccessPacketInteractive}/{pmNoRabEstablishAttemptPacketInteractive})*100',
  1),
 -- Data Drop Rate
 (14,2,2,NULL,
  '100*({UtranCell_pmNoSystemRbReleaseHs})/({UtranCell_pmNoNormalRbReleaseHs}+{UtranCell_pmNoSystemRbReleaseHs}+{UtranCell_pmChSwitchSuccHsUra}+{UtranCell_pmNoSuccRbReconfPsIntDch}+{UtranCell_pmPsIntHsToFachSucc})',
  1),
 -- DL HS Throughput
 (15,2,2,NULL,
  '{Hsdsch_pmSumHsDlRlcUserPacketThp}/{Hsdsch_pmSamplesHsDlRlcUserPacketThp}',
  1);

-- ---------------------------------------------------------------------------
-- 13. KPI formulas — Ericsson 4G (vendor_id=2, technology_id=3)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO kpi_formulas (kpi_id, vendor_id, technology_id, operator_id, expression, is_active) VALUES
 -- Cell Availability
 (5, 2,3,NULL,
  '100*({L_Cell_Avail_Dur}/{capture_duration})',
  1),
 -- Data Service Access Success Rate
 (16,2,3,NULL,
  '100*({pmRrcConnEstabSucc}/({pmRrcConnEstabAtt}-{pmRrcConnEstabAttReatt}-{pmRrcConnEstabFailMmeOvlMod}-{pmRrcConnEstabFailMmeOvlMos}))*({pmS1SigConnEstabSucc}/({pmS1SigConnEstabAtt}-{pmS1SigConnEstabFailMmeOvlMos}))*({pmErabEstabSuccInit}/{pmErabEstabAttInit})',
  1),
 -- Data Service Drop Rate
 (17,2,3,NULL,
  '100*({pmErabRelAbnormalEnbAct}+{pmErabRelAbnormalMmeAct})/({pmErabRelAbnormalEnb}+{pmErabRelNormalEnb}+{pmErabRelMme})',
  1),
 -- DL Speed (Mbps) — formula: (1000*(vol/time))/1000 = vol/time
 (18,2,3,NULL,
  '{pmPdcpVolDlDrb}/{pmSchedActivityCellDl}',
  1),
 -- UL Speed (Mbps)
 (19,2,3,NULL,
  '{pmPdcpVolUlDrb}/{pmSchedActivityCellUl}',
  1);

-- ---------------------------------------------------------------------------
-- 14. QoS thresholds for new KPIs (global, all operators)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO qos_thresholds
 (kpi_id, technology_id, operator_id, comparator, required_value, warning_margin, effective_from, is_active)
VALUES
 -- Call Success Rate (2G/3G) >= 97%
 (9, 1,NULL,'GTE',97.0,1.0,'2026-01-01',1),
 (9, 2,NULL,'GTE',97.0,1.0,'2026-01-01',1),
 -- Voice Call Setup Success Rate (3G) >= 98%
 (10,2,NULL,'GTE',98.0,1.0,'2026-01-01',1),
 -- Voice Call Success Rate (3G) >= 97%
 (11,2,NULL,'GTE',97.0,1.0,'2026-01-01',1),
 -- Voice Call Drop Rate (3G) <= 1%
 (12,2,NULL,'LTE',1.0,0.3,'2026-01-01',1),
 -- Data Access Success Rate (3G) >= 95%
 (13,2,NULL,'GTE',95.0,2.0,'2026-01-01',1),
 -- Data Drop Rate 3G <= 2%
 (14,2,NULL,'LTE',2.0,0.5,'2026-01-01',1),
 -- DL HS Throughput (3G) >= 512 kbps
 (15,2,NULL,'GTE',512.0,100.0,'2026-01-01',1),
 -- Data Service Access Success Rate (4G) >= 98%
 (16,3,NULL,'GTE',98.0,1.0,'2026-01-01',1),
 -- Data Service Drop Rate (4G) <= 2%
 (17,3,NULL,'LTE',2.0,0.5,'2026-01-01',1),
 -- DL Speed (4G) >= 1 Mbps
 (18,3,NULL,'GTE',1.0,0.2,'2026-01-01',1),
 -- UL Speed (4G) >= 0.5 Mbps
 (19,3,NULL,'GTE',0.5,0.1,'2026-01-01',1);
