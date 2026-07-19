import { query } from './src/config/db.js';
import { ensureTables as ensureRealtime } from './src/modules/realtime/realtime.service.js';
import { ensureTables as ensureSpectrum } from './src/modules/spectrum/spectrum.service.js';
import { ensureTables as ensureObligations } from './src/modules/obligations/obligations.service.js';
import { ensureTables as ensurePenalties } from './src/modules/penalties/penalties.service.js';
import { ensureTables as ensureEnforcement } from './src/modules/enforcement/enforcement.service.js';
import { ensureTable as ensureDisputes } from './src/modules/disputes/disputes.service.js';
import { ensureTables as ensureQoE } from './src/modules/qoe/qoe.service.js';
import { ensureTables as ensureCampaigns } from './src/modules/drivetest/campaigns.service.js';
import { ensureTables as ensureDriveTest } from './src/modules/drivetest/drivetest.service.js';

function randomDate(startDaysAgo, endDaysAgo) {
  const date = new Date();
  const diff = startDaysAgo - endDaysAgo;
  date.setDate(date.getDate() - endDaysAgo - Math.floor(Math.random() * diff));
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log('Starting Regulatory Report data seeding...');

  try {
    console.log('Ensuring tables exist...');
    await ensureRealtime();
    await ensureSpectrum();
    await ensureObligations();
    await ensurePenalties();
    await ensureEnforcement();
    await ensureDisputes();
    await ensureQoE();
    await ensureCampaigns();
    await ensureDriveTest();
    console.log('Tables ready.');

    const operators = await query("SELECT operator_id, operator_name FROM operators WHERE status = 'ACTIVE'");
    if (operators.length === 0) {
      console.error('No active operators found!');
      process.exit(1);
    }
    
    // 1. QoS & Network Performance (kpi_measurements)
    console.log('Seeding QoS (kpi_measurements)...');
    await query("DELETE FROM kpi_measurements WHERE kpi_name IN ('Call Setup Success Rate', 'Drop Call Rate', 'Data Download Speed (3G)', 'Data Download Speed (4G)', 'Handover Success Rate')");
    
    const qosKPIs = [
      { name: 'Call Setup Success Rate', tech: '2G', unit: '%', dir: 'above', threshold: 95 },
      { name: 'Drop Call Rate', tech: '2G', unit: '%', dir: 'below', threshold: 2 },
      { name: 'Call Setup Success Rate', tech: '3G', unit: '%', dir: 'above', threshold: 95 },
      { name: 'Drop Call Rate', tech: '3G', unit: '%', dir: 'below', threshold: 2 },
      { name: 'Data Download Speed (3G)', tech: '3G', unit: 'Mbps', dir: 'above', threshold: 2 },
      { name: 'Data Download Speed (4G)', tech: '4G', unit: 'Mbps', dir: 'above', threshold: 5 },
      { name: 'Handover Success Rate', tech: '3G', unit: '%', dir: 'above', threshold: 90 },
      { name: 'Handover Success Rate', tech: '4G', unit: '%', dir: 'above', threshold: 95 },
    ];
    
    // Create kpi_thresholds if missing
    await query(`CREATE TABLE IF NOT EXISTS kpi_thresholds (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      kpi_name        VARCHAR(200) NOT NULL,
      technology      VARCHAR(20)  NULL,
      threshold_value DOUBLE       NOT NULL,
      direction       ENUM('above','below','between') NOT NULL,
      unit            VARCHAR(40)  NULL,
      active          TINYINT(1)   DEFAULT 1,
      UNIQUE KEY uq_kpi_tech (kpi_name, technology)
    ) ENGINE=InnoDB`);

    // Create thresholds
    for (const k of qosKPIs) {
      await query(`
        INSERT INTO kpi_thresholds (kpi_name, technology, threshold_value, direction, unit, active)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE threshold_value=VALUES(threshold_value)
      `, [k.name, k.tech, k.threshold, k.dir, k.unit]);
    }
    
    // Insert 60 days of data
    const kpiPromises = [];
    for (const op of operators) {
      for (const k of qosKPIs) {
        for (let i = 0; i < 60; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const periodStart = date.toISOString().slice(0, 10);
          
          let val;
          if (k.dir === 'above') {
            val = k.threshold - 2 + (Math.random() * 5); // Some fail, mostly pass
            if (val > 100 && k.unit === '%') val = 100;
          } else {
            val = k.threshold - 1 + (Math.random() * 2);
            if (val < 0) val = 0;
          }
          
          kpiPromises.push(query(`
            INSERT IGNORE INTO kpi_measurements (operator_id, kpi_name, technology, period_start, period_end, value)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [op.operator_id, k.name, k.tech, periodStart, periodStart, val.toFixed(2)]));
        }
      }
    }
    await Promise.all(kpiPromises);

    // 2. Spectrum Management
    console.log('Seeding Spectrum...');
    await query("DELETE FROM spectrum_assignments WHERE assignment_ref LIKE 'SA-202%'");
    await query("DELETE FROM spectrum_interference WHERE report_ref LIKE 'INT-202%'");
    
    const bands = [
      { name: '800 MHz', low: 790, high: 862, bw: 10, tech: '4G' },
      { name: '900 MHz', low: 880, high: 960, bw: 15, tech: '2G' },
      { name: '1800 MHz', low: 1710, high: 1880, bw: 20, tech: '4G' },
      { name: '2100 MHz', low: 1920, high: 2170, bw: 15, tech: '3G' },
    ];
    
    let saIdx = 1000;
    for (const op of operators) {
      const assigned = [];
      while(assigned.length < 2) {
         const b = randomChoice(bands);
         if (!assigned.includes(b.name)) assigned.push(b.name);
      }
      
      for (const bandName of assigned) {
        const b = bands.find(x => x.name === bandName);
        const issueDate = new Date();
        issueDate.setFullYear(issueDate.getFullYear() - randomInt(1, 4));
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + randomInt(0, 5)); // Some might expire soon
        
        await query(`
          INSERT INTO spectrum_assignments (assignment_ref, operator_id, band_name, frequency_low, frequency_high, bandwidth_mhz, technology, status, assigned_date, expiry_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
        `, [`SA-2026-${saIdx++}`, op.operator_id, b.name, b.low, b.high, b.bw, b.tech, issueDate.toISOString().slice(0,10), expiryDate.toISOString().slice(0,10)]);
      }
    }
    
    // Interference
    for (let i = 0; i < 15; i++) {
      await query(`
        INSERT INTO spectrum_interference (report_ref, reporter_op_id, affected_op_id, band_name, frequency_mhz, severity, status, reported_at, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `INT-2026-${i}`, randomChoice(operators).operator_id, randomChoice(operators).operator_id,
        randomChoice(bands).name, 900 + randomInt(1, 100),
        randomChoice(['LOW', 'MEDIUM', 'HIGH']),
        randomChoice(['OPEN', 'INVESTIGATING', 'RESOLVED']),
        randomDate(60, 0),
        'Cross-border interference suspected or illegal booster deployment in district.'
      ]);
    }

    // 3. Annual Compliance & SLA
    console.log('Seeding Compliance (Obligations, Penalties, Disputes, Enforcement)...');
    await query("DELETE FROM license_obligations");
    await query("DELETE FROM penalty_assessments");
    await query("DELETE FROM enforcement_cases");
    await query("DELETE FROM operator_disputes");
    
    const obTitles = ['Rural 4G Expansion', 'Annual Regulatory Fee', 'QoS Minimum Standard', 'Sim Registration Audit', 'Green Energy Transition'];
    let obIdx = 100;
    for (const op of operators) {
      for (let i = 0; i < 3; i++) {
        await query(`
          INSERT INTO license_obligations (obligation_ref, operator_id, title, obligation_type, status, current_value, target_value, target_unit, due_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          `OBL-2026-${obIdx++}`, op.operator_id, randomChoice(obTitles), randomChoice(['COVERAGE', 'FINANCIAL', 'SLA', 'REPORTING']),
          randomChoice(['PENDING', 'FULFILLED', 'BREACHED', 'AT_RISK']),
          randomInt(50, 95), 100, '%',
          new Date(new Date().setMonth(new Date().getMonth() + randomInt(-2, 6))).toISOString().slice(0,10)
        ]);
      }
      
      // Penalties
      if (Math.random() > 0.5) {
        await query(`
          INSERT INTO penalty_assessments (operator_id, assessment_ref, title, violation_type, final_fine, status, issued_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          op.operator_id, `PEN-2026-${randomInt(100,999)}`, 'Violation of QoS Directives',
          randomChoice(['COVERAGE', 'SLA', 'REPORTING', 'OTHER']),
          randomInt(50000, 250000) * 1000, // SLL
          randomChoice(['DRAFT', 'ISSUED', 'DISPUTED', 'PAID']),
          randomDate(180, 10)
        ]);
      }
      
      // Enforcement
      if (Math.random() > 0.7) {
        await query(`
          INSERT INTO enforcement_cases (case_ref, operator_id, title, status, severity, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          `ENF-2026-${randomInt(100,999)}`, op.operator_id,
          'Non-compliance with site-sharing directive',
          randomChoice(['OPEN', 'NOTIFIED', 'ESCALATED', 'CLOSED']),
          randomChoice(['MEDIUM', 'HIGH', 'CRITICAL']),
          randomDate(120, 5)
        ]);
      }
      
      // Disputes
      if (Math.random() > 0.6) {
        await query(`
          INSERT INTO operator_disputes (dispute_ref, operator_id, title, description, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          `DIS-2026-${randomInt(100,999)}`, op.operator_id,
          'Interconnection fee billing dispute',
          'We dispute the interconnection fee based on the newly reported numbers.',
          randomChoice(['OPEN', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED']),
          randomDate(120, 10)
        ]);
      }
    }

    // 4. Consumer QoE
    console.log('Seeding Consumer Complaints...');
    await query("DELETE FROM consumer_complaints");
    const issues = ['NO_COVERAGE','CALL_DROP','POOR_VOICE_QUALITY','SLOW_DATA','NO_DATA','SMS_FAILURE','BILLING_ISSUE','OTHER'];
    const districts = ['Western Area Urban', 'Bo', 'Kenema', 'Makeni', 'Kono', 'Port Loko'];
    
    const complaintPromises = [];
    for (let i = 0; i < 500; i++) {
      complaintPromises.push(query(`
        INSERT INTO consumer_complaints (complaint_ref, operator_id, issue_type, district, severity, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        `CMP-2026-${randomInt(1000,9999)}-${i}`,
        randomChoice(operators).operator_id, randomChoice(issues), randomChoice(districts),
        randomChoice(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        randomChoice(['NEW', 'UNDER_REVIEW', 'RESOLVED']),
        randomDate(90, 0)
      ]));
    }
    await Promise.all(complaintPromises);

    // 5. Drive Test Campaigns
    console.log('Seeding Drive Test Campaigns...');
    await query("DELETE FROM dt_campaign_tests");
    await query("DELETE FROM dt_campaigns");
    
    for (const op of operators) {
      const campRes = await query(`
        INSERT INTO dt_campaigns (campaign_ref, operator_id, name, status, planned_start, planned_end, actual_start, actual_end)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `DT-CAMP-${randomInt(1000, 9999)}`, op.operator_id, `National QoS Audit - ${op.operator_name}`, 'COMPLETED',
        randomDate(60, 40), randomDate(30, 10), randomDate(55, 35), randomDate(25, 5)
      ]);
      const campId = campRes.insertId;
      
      // Link existing drive tests for this operator to the campaign
      const tests = await query("SELECT drive_test_id FROM drive_tests WHERE operator_id = ?", [op.operator_id]);
      for (const t of tests) {
        await query("INSERT INTO dt_campaign_tests (campaign_id, drive_test_id) VALUES (?, ?)", [campId, t.drive_test_id]);
      }
    }

    console.log('Data seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
