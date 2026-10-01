const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'smilecare.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'patient' CHECK(role IN ('patient','admin','staff')),
      name TEXT NOT NULL,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dob TEXT,
      gender TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      emergency_contact TEXT,
      insurance_provider TEXT,
      insurance_id TEXT,
      patient_qr_token TEXT UNIQUE NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT,
      bio TEXT,
      education TEXT,
      experience_years INTEGER DEFAULT 0,
      email TEXT,
      phone TEXT,
      availability TEXT,
      accent_color TEXT DEFAULT '#0d9488',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER DEFAULT 30,
      price_min REAL,
      price_max REAL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id INTEGER REFERENCES doctors(id),
      service_id INTEGER REFERENCES services(id),
      appointment_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled','rescheduled')),
      reason TEXT,
      notes TEXT,
      checkin_token TEXT UNIQUE NOT NULL,
      checkin_token_expires_at TEXT,
      checked_in_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(appointment_date);
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_slot
      ON appointments(doctor_id, appointment_date, time_slot)
      WHERE status IN ('pending','confirmed','rescheduled');

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      report_date TEXT NOT NULL,
      file_path TEXT,
      file_name TEXT,
      mime_type TEXT,
      file_size INTEGER,
      uploaded_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_reports_patient ON reports(patient_id);

    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      doctor_id INTEGER REFERENCES doctors(id),
      medications TEXT NOT NULL,
      notes TEXT,
      issued_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      link TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','refunded','failed')),
      method TEXT,
      reference TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id INTEGER,
      meta TEXT,
      ip TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  seed();
}

function seed(force = false) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@smilecare.com';
  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(adminEmail);
  if (!existing) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@12345', 12);
    db.prepare(`INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, 'admin', ?)`)
      .run(adminEmail, hash, 'Clinic Administrator');
    console.log(`[seed] admin created: ${adminEmail}`);
  }

  const doctorCount = db.prepare(`SELECT COUNT(*) c FROM doctors`).get().c;
  if (doctorCount === 0) {
    const docs = [
      ['Dr. Sarah Johnson, DDS', 'General & Cosmetic Dentistry', 'Dr. Johnson is passionate about helping patients achieve their best smile through gentle, comprehensive care.', 'University of Pennsylvania School of Dental Medicine, 2012', 12, 'sarah@smilecare.com', '(555) 123-4567', '#0d9488'],
      ['Dr. Michael Chen, DDS', 'Orthodontics & Oral Surgery', 'Dr. Chen brings expertise in orthodontics and oral surgery, providing comprehensive treatment for complex cases.', 'Harvard School of Dental Medicine, 2010', 15, 'michael@smilecare.com', '(555) 123-4568', '#2563eb'],
      ['Dr. Lisa Rodriguez, DDS', 'Pediatric Dentistry', 'Dr. Rodriguez makes dental visits fun and comfortable for children, focusing on preventive care.', 'UCLA School of Dentistry, 2017', 8, 'lisa@smilecare.com', '(555) 123-4569', '#db2777'],
      ['Dr. James Wilson, DDS', 'Periodontics & Implants', 'Dr. Wilson specializes in gum health and dental implants, helping patients restore their oral health.', 'University of Michigan School of Dentistry, 2008', 17, 'james@smilecare.com', '(555) 123-4570', '#7c3aed']
    ];
    const stmt = db.prepare(`INSERT INTO doctors (name, specialty, bio, education, experience_years, email, phone, accent_color, availability) VALUES (?,?,?,?,?,?,?,?,?)`);
    const avail = JSON.stringify({ Mon: ['08:00','12:00','13:00','17:00'], Tue: ['08:00','12:00','13:00','17:00'], Wed: ['08:00','12:00','13:00','17:00'], Thu: ['08:00','12:00','13:00','17:00'], Fri: ['08:00','12:00','13:00','16:00'], Sat: ['09:00','13:00'] });
    docs.forEach(d => stmt.run(...d, avail));
  }

  const svcCount = db.prepare(`SELECT COUNT(*) c FROM services`).get().c;
  if (svcCount === 0) {
    const svcs = [
      ['General Dentistry', 'Routine Cleaning & Exam', 'Professional cleaning and comprehensive oral exam.', 60, 120, 150],
      ['General Dentistry', 'Dental Fillings', 'Tooth-colored composite fillings for cavity treatment.', 45, 150, 300],
      ['General Dentistry', 'Tooth Extraction', 'Safe and comfortable tooth removal.', 45, 200, 400],
      ['General Dentistry', 'Fluoride Treatment', 'Professional fluoride application to strengthen teeth.', 15, 50, 75],
      ['Cosmetic Dentistry', 'Teeth Whitening', 'Professional in-office whitening for a brighter smile.', 75, 300, 600],
      ['Cosmetic Dentistry', 'Porcelain Veneers', 'Custom thin shells to improve tooth appearance.', 90, 800, 1500],
      ['Cosmetic Dentistry', 'Dental Bonding', 'Tooth-colored resin to repair chips and gaps.', 45, 200, 500],
      ['Restorative Dentistry', 'Dental Crowns & Bridges', 'Custom caps and bridges to restore damaged teeth.', 90, 800, 1500],
      ['Restorative Dentistry', 'Dental Implants', 'Permanent tooth replacement with titanium implants.', 120, 2000, 4000],
      ['Restorative Dentistry', 'Root Canal Therapy', 'Save infected teeth with gentle root canal treatment.', 75, 800, 1200],
      ['Orthodontics', 'Traditional Metal Braces', 'Effective orthodontic treatment with proven results.', 60, 3000, 6000],
      ['Orthodontics', 'Invisalign Clear Aligners', 'Nearly invisible removable aligners.', 60, 3500, 8000],
      ['Emergency', 'Emergency Consultation', 'Urgent same-day dental care.', 30, 100, 250]
    ];
    const s = db.prepare(`INSERT INTO services (category, name, description, duration_minutes, price_min, price_max) VALUES (?,?,?,?,?,?)`);
    svcs.forEach(x => s.run(...x));
  }
}

module.exports = { db, initDb, seed };