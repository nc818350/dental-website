const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('./db');
const {
  hashPassword, verifyPassword, signToken,
  setSessionCookie, clearSessionCookie,
  requireAuth, requireRole, randomToken
} = require('./auth');
const qr = require('./qr');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, String(req.user.uid));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10).replace(/[^.\w]/g, '');
    cb(null, `${Date.now()}-${randomToken(8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf','image/png','image/jpeg','image/webp','image/gif'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Unsupported file type'));
    cb(null, true);
  }
});

/* ---------------- helpers ---------------- */
function ok(res, data) { res.json({ ok: true, ...data }); }
function fail(res, code, msg) { res.status(code).json({ error: msg }); }
function audit(req, action, entity, entityId, meta) {
  try {
    db.prepare(`INSERT INTO audit_log (actor_id, action, entity, entity_id, meta, ip) VALUES (?,?,?,?,?,?)`)
      .run(req.user?.uid || null, action, entity || null, entityId || null, meta ? JSON.stringify(meta) : null, req.ip);
  } catch {}
}
function notify(userId, type, title, message, link) {
  db.prepare(`INSERT INTO notifications (user_id, type, title, message, link) VALUES (?,?,?,?,?)`)
    .run(userId, type, title, message || null, link || null);
}
function patientOfUser(userId) {
  return db.prepare(`SELECT * FROM patients WHERE user_id = ?`).get(userId);
}
function apptRef() {
  const d = new Date();
  return `SC-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${randomToken(4).toUpperCase()}`;
}

/* =========================================================
   AUTH
   ========================================================= */
router.post('/auth/register', (req, res) => {
  const { email, password, name, phone } = req.body || {};
  if (!email || !password || !name) return fail(res, 400, 'Name, email and password are required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'Invalid email address');
  if (String(password).length < 8) return fail(res, 400, 'Password must be at least 8 characters');

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.toLowerCase());
  if (existing) return fail(res, 409, 'An account with that email already exists');

  const tx = db.transaction(() => {
    const info = db.prepare(`INSERT INTO users (email, password_hash, role, name, phone) VALUES (?,?, 'patient', ?, ?)`)
      .run(email.toLowerCase(), hashPassword(password), name, phone || null);
    const userId = info.lastInsertRowid;
    const qrToken = qr.newPatientQrToken();
    db.prepare(`INSERT INTO patients (user_id, patient_qr_token) VALUES (?, ?)`).run(userId, qrToken);
    return userId;
  });

  let userId;
  try { userId = tx(); } catch (e) { return fail(res, 500, 'Registration failed'); }

  const user = db.prepare(`SELECT id, email, role, name FROM users WHERE id = ?`).get(userId);
  const token = signToken(user);
  setSessionCookie(res, token);
  notify(userId, 'system', 'Welcome to SmileCare', 'Your patient portal is ready. Book your first appointment anytime.', '/portal.html');
  audit(req, 'register', 'user', userId);
  ok(res, { user });
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, 400, 'Email and password are required');
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(String(email).toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) return fail(res, 401, 'Invalid email or password');
  const token = signToken(user);
  setSessionCookie(res, token);
  audit(req, 'login', 'user', user.id);
  ok(res, { user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

router.post('/auth/logout', (req, res) => {
  clearSessionCookie(res);
  ok(res, {});
});

router.get('/auth/me', requireAuth, (req, res) => {
  const user = db.prepare(`SELECT id, email, role, name, phone, created_at FROM users WHERE id = ?`).get(req.user.uid);
  if (!user) return fail(res, 404, 'User not found');
  let patient = null;
  if (user.role === 'patient') patient = patientOfUser(user.id);
  ok(res, { user, patient });
});

/* =========================================================
   PUBLIC - doctors, services, testimonials-ish
   ========================================================= */
router.get('/doctors', (req, res) => {
  const docs = db.prepare(`SELECT id, name, specialty, bio, education, experience_years, email, phone, accent_color, availability FROM doctors WHERE active = 1 ORDER BY id`).all();
  ok(res, { doctors: docs });
});

router.get('/services', (req, res) => {
  const svcs = db.prepare(`SELECT * FROM services WHERE active = 1 ORDER BY category, name`).all();
  ok(res, { services: svcs });
});

router.get('/availability', (req, res) => {
  const { doctorId, date } = req.query;
  if (!doctorId || !date) return fail(res, 400, 'doctorId and date required');
  const doc = db.prepare(`SELECT availability FROM doctors WHERE id = ? AND active = 1`).get(doctorId);
  if (!doc) return fail(res, 404, 'Doctor not found');
  let avail = {};
  try { avail = JSON.parse(doc.availability || '{}'); } catch {}
  const weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(date + 'T00:00:00').getDay()];
  const windows = avail[weekday] || [];
  const slots = [];
  for (let i = 0; i < windows.length; i += 2) {
    const [start, end] = [windows[i], windows[i + 1]];
    if (!start || !end) continue;
    let [sh, sm] = start.split(':').map(Number);
    let [eh, em] = end.split(':').map(Number);
    for (let m = sh * 60 + sm; m + 30 <= eh * 60 + em; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }
  const booked = db.prepare(`
    SELECT time_slot FROM appointments
    WHERE doctor_id = ? AND appointment_date = ? AND status IN ('pending','confirmed','rescheduled')
  `).all(doctorId, date).map(r => r.time_slot);
  const available = slots.filter(s => !booked.includes(s));
  ok(res, { slots: available });
});

/* =========================================================
   APPOINTMENTS
   ========================================================= */
router.post('/appointments', requireAuth, requireRole('patient'), async (req, res) => {
  const patient = patientOfUser(req.user.uid);
  if (!patient) return fail(res, 404, 'Patient profile not found');

  const { doctorId, serviceId, date, time, reason, notes } = req.body || {};
  if (!doctorId || !serviceId || !date || !time) return fail(res, 400, 'Doctor, service, date and time are required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 400, 'Invalid date');
  if (new Date(date + 'T00:00:00') < new Date(new Date().toDateString())) return fail(res, 400, 'Date cannot be in the past');

  const clash = db.prepare(`
    SELECT id FROM appointments
    WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ?
      AND status IN ('pending','confirmed','rescheduled')
  `).get(doctorId, date, time);
  if (clash) return fail(res, 409, 'That time slot is no longer available. Please choose another.');

  const token = qr.newAppointmentQrToken();
  const expires = new Date(date + 'T23:59:59');
  expires.setDate(expires.getDate() + 30);

  const info = db.prepare(`
    INSERT INTO appointments (reference, patient_id, doctor_id, service_id, appointment_date, time_slot, reason, notes, checkin_token, checkin_token_expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(apptRef(), patient.id, doctorId, serviceId, date, time, reason || null, notes || null, token, expires.toISOString());

  notify(req.user.uid, 'appointment', 'Appointment requested',
    `Your appointment on ${date} at ${time} is pending confirmation. Reference: ${info.lastInsertRowid}`,
    `/portal.html#appointments/${info.lastInsertRowid}`);

  audit(req, 'appointment.create', 'appointment', info.lastInsertRowid);

  const appt = db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(info.lastInsertRowid);
  const qrUrl = qr.appointmentQrUrl(appt.checkin_token);
  const qrImage = await qr.qrDataUrl(qrUrl);
  ok(res, { appointment: appt, qrUrl, qrImage });
});

router.get('/appointments', requireAuth, (req, res) => {
  let rows;
  if (req.user.role === 'patient') {
    const p = patientOfUser(req.user.uid);
    if (!p) return fail(res, 404, 'Patient not found');
    rows = db.prepare(`
      SELECT a.*, d.name AS doctor_name, d.specialty AS doctor_specialty, s.name AS service_name, s.category AS service_category
      FROM appointments a
      LEFT JOIN doctors d ON d.id = a.doctor_id
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC, a.time_slot DESC
    `).all(p.id);
  } else {
    rows = db.prepare(`
      SELECT a.*, d.name AS doctor_name, u.name AS patient_name, u.email AS patient_email, u.phone AS patient_phone,
             s.name AS service_name, s.category AS service_category, p.id AS patient_id
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN users u ON u.id = p.user_id
      LEFT JOIN doctors d ON d.id = a.doctor_id
      LEFT JOIN services s ON s.id = a.service_id
      ORDER BY a.appointment_date DESC, a.time_slot DESC
      LIMIT 500
    `).all();
  }
  ok(res, { appointments: rows });
});

router.get('/appointments/:id', requireAuth, (req, res) => {
  const row = db.prepare(`
    SELECT a.*, d.name AS doctor_name, d.specialty AS doctor_specialty,
           s.name AS service_name, s.category AS service_category,
           p.id AS patient_id, u.name AS patient_name, u.email AS patient_email
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN users u ON u.id = p.user_id
    LEFT JOIN doctors d ON d.id = a.doctor_id
    LEFT JOIN services s ON s.id = a.service_id
    WHERE a.id = ?
  `).get(req.params.id);
  if (!row) return fail(res, 404, 'Appointment not found');
  if (req.user.role === 'patient') {
    const p = patientOfUser(req.user.uid);
    if (!p || p.id !== row.patient_id) return fail(res, 403, 'Access denied');
  }
  ok(res, { appointment: row });
});

router.post('/appointments/:id/cancel', requireAuth, (req, res) => {
  const row = db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(req.params.id);
  if (!row) return fail(res, 404, 'Appointment not found');
  if (req.user.role === 'patient') {
    const p = patientOfUser(req.user.uid);
    if (!p || p.id !== row.patient_id) return fail(res, 403, 'Access denied');
  }
  if (['completed','cancelled'].includes(row.status)) return fail(res, 400, 'Appointment cannot be cancelled');
  db.prepare(`UPDATE appointments SET status='cancelled', updated_at=datetime('now') WHERE id = ?`).run(row.id);
  const pu = db.prepare(`SELECT user_id FROM patients WHERE id = ?`).get(row.patient_id);
  notify(pu.user_id, 'appointment', 'Appointment cancelled',
    `Your appointment on ${row.appointment_date} at ${row.time_slot} has been cancelled.`, '/portal.html#appointments');
  audit(req, 'appointment.cancel', 'appointment', row.id);
  ok(res, {});
});

router.post('/appointments/:id/reschedule', requireAuth, (req, res) => {
  const { date, time } = req.body || {};
  if (!date || !time) return fail(res, 400, 'New date and time are required');
  const row = db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(req.params.id);
  if (!row) return fail(res, 404, 'Appointment not found');
  if (req.user.role === 'patient') {
    const p = patientOfUser(req.user.uid);
    if (!p || p.id !== row.patient_id) return fail(res, 403, 'Access denied');
  }
  const clash = db.prepare(`
    SELECT id FROM appointments
    WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND id <> ?
      AND status IN ('pending','confirmed','rescheduled')
  `).get(row.doctor_id, date, time, row.id);
  if (clash) return fail(res, 409, 'That time slot is unavailable');
  db.prepare(`UPDATE appointments SET appointment_date=?, time_slot=?, status='rescheduled', updated_at=datetime('now') WHERE id=?`)
    .run(date, time, row.id);
  const pu = db.prepare(`SELECT user_id FROM patients WHERE id = ?`).get(row.patient_id);
  notify(pu.user_id, 'appointment', 'Appointment rescheduled',
    `Your appointment has been moved to ${date} at ${time}.`, '/portal.html#appointments');
  audit(req, 'appointment.reschedule', 'appointment', row.id);
  ok(res, {});
});

router.post('/appointments/:id/status', requireAuth, requireRole('admin','staff'), (req, res) => {
  const { status } = req.body || {};
  const allowed = ['pending','confirmed','completed','cancelled','rescheduled'];
  if (!allowed.includes(status)) return fail(res, 400, 'Invalid status');
  const row = db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(req.params.id);
  if (!row) return fail(res, 404, 'Appointment not found');
  db.prepare(`UPDATE appointments SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, row.id);
  const pu = db.prepare(`SELECT user_id FROM patients WHERE id = ?`).get(row.patient_id);
  notify(pu.user_id, 'appointment', `Appointment ${status}`,
    `Your appointment on ${row.appointment_date} is now ${status}.`, '/portal.html#appointments');
  audit(req, 'appointment.status', 'appointment', row.id, { status });
  ok(res, {});
});

/* =========================================================
   REPORTS
   ========================================================= */
router.post('/reports', requireAuth, requireRole('admin','staff'), upload.single('file'), (req, res) => {
  const { patientId, appointmentId, title, description, reportDate } = req.body || {};
  if (!patientId || !title || !reportDate) return fail(res, 400, 'Patient, title and date are required');
  const info = db.prepare(`
    INSERT INTO reports (patient_id, appointment_id, title, description, report_date, file_path, file_name, mime_type, file_size, uploaded_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    patientId, appointmentId || null, title, description || null, reportDate,
    req.file ? req.file.path : null,
    req.file ? req.file.originalname : null,
    req.file ? req.file.mimetype : null,
    req.file ? req.file.size : null,
    req.user.uid
  );
  const pu = db.prepare(`SELECT user_id FROM patients WHERE id = ?`).get(patientId);
  if (pu) notify(pu.user_id, 'report', 'New report uploaded', `"${title}" is now available in your portal.`, '/portal.html#reports');
  audit(req, 'report.create', 'report', info.lastInsertRowid);
  ok(res, { id: info.lastInsertRowid });
});

router.get('/reports', requireAuth, (req, res) => {
  let rows;
  if (req.user.role === 'patient') {
    const p = patientOfUser(req.user.uid);
    if (!p) return fail(res, 404, 'Patient not found');
    rows = db.prepare(`SELECT id, title, description, report_date, file_name, mime_type, created_at FROM reports WHERE patient_id = ? ORDER BY report_date DESC`).all(p.id);
  } else {
    rows = db.prepare(`
      SELECT r.id, r.title, r.description, r.report_date, r.file_name, r.mime_type, r.created_at,
             u.name AS patient_name, r.patient_id
      FROM reports r
      JOIN patients p ON p.id = r.patient_id
      JOIN users u ON u.id = p.user_id
      ORDER BY r.report_date DESC LIMIT 500
    `).all();
  }
  ok(res, { reports: rows });
});

router.get('/reports/:id/download', requireAuth, (req, res) => {
  const row = db.prepare(`
    SELECT r.*, p.user_id AS patient_user_id FROM reports r
    JOIN patients p ON p.id = r.patient_id WHERE r.id = ?
  `).get(req.params.id);
  if (!row || !row.file_path) return fail(res, 404, 'File not found');
  if (req.user.role === 'patient' && row.patient_user_id !== req.user.uid) return fail(res, 403, 'Access denied');
  if (!fs.existsSync(row.file_path)) return fail(res, 404, 'File missing from storage');
  audit(req, 'report.download', 'report', row.id);
  res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name || 'report')}"`);
  fs.createReadStream(row.file_path).pipe(res);
});

router.delete('/reports/:id', requireAuth, requireRole('admin'), (req, res) => {
  const row = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(req.params.id);
  if (!row) return fail(res, 404, 'Report not found');
  if (row.file_path && fs.existsSync(row.file_path)) { try { fs.unlinkSync(row.file_path); } catch {} }
  db.prepare(`DELETE FROM reports WHERE id = ?`).run(row.id);
  audit(req, 'report.delete', 'report', row.id);
  ok(res, {});
});

/* =========================================================
   PRESCRIPTIONS
   ========================================================= */
router.post('/prescriptions', requireAuth, requireRole('admin','staff'), (req, res) => {
  const { patientId, appointmentId, doctorId, medications, notes, issuedDate } = req.body || {};
  if (!patientId || !medications || !issuedDate) return fail(res, 400, 'Patient, medications and date required');
  const info = db.prepare(`
    INSERT INTO prescriptions (patient_id, appointment_id, doctor_id, medications, notes, issued_date)
    VALUES (?,?,?,?,?,?)
  `).run(patientId, appointmentId || null, doctorId || null, medications, notes || null, issuedDate);
  const pu = db.prepare(`SELECT user_id FROM patients WHERE id = ?`).get(patientId);
  if (pu) notify(pu.user_id, 'prescription', 'New prescription added', 'A new prescription has been added to your record.', '/portal.html#prescriptions');
  audit(req, 'prescription.create', 'prescription', info.lastInsertRowid);
  ok(res, { id: info.lastInsertRowid });
});

router.get('/prescriptions', requireAuth, (req, res) => {
  let rows;
  if (req.user.role === 'patient') {
    const p = patientOfUser(req.user.uid);
    if (!p) return fail(res, 404, 'Patient not found');
    rows = db.prepare(`
      SELECT pr.*, d.name AS doctor_name FROM prescriptions pr
      LEFT JOIN doctors d ON d.id = pr.doctor_id
      WHERE pr.patient_id = ? ORDER BY pr.issued_date DESC
    `).all(p.id);
  } else {
    rows = db.prepare(`
      SELECT pr.*, d.name AS doctor_name, u.name AS patient_name, pr.patient_id
      FROM prescriptions pr
      JOIN patients p ON p.id = pr.patient_id
      JOIN users u ON u.id = p.user_id
      LEFT JOIN doctors d ON d.id = pr.doctor_id
      ORDER BY pr.issued_date DESC LIMIT 500
    `).all();
  }
  ok(res, { prescriptions: rows });
});

/* =========================================================
   NOTIFICATIONS
   ========================================================= */
router.get('/notifications', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`).all(req.user.uid);
  const unread = db.prepare(`SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0`).get(req.user.uid).c;
  ok(res, { notifications: rows, unread });
});

router.post('/notifications/:id/read', requireAuth, (req, res) => {
  db.prepare(`UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`).run(req.params.id, req.user.uid);
  ok(res, {});
});

router.post('/notifications/read-all', requireAuth, (req, res) => {
  db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ?`).run(req.user.uid);
  ok(res, {});
});

/* =========================================================
   PATIENT PROFILE
   ========================================================= */
router.put('/patients/me', requireAuth, requireRole('patient'), (req, res) => {
  const p = patientOfUser(req.user.uid);
  if (!p) return fail(res, 404, 'Patient not found');
  const b = req.body || {};
  db.prepare(`
    UPDATE patients SET dob=?, gender=?, address=?, city=?, state=?, zip=?,
      emergency_contact=?, insurance_provider=?, insurance_id=?, notes=?
    WHERE id = ?
  `).run(b.dob || null, b.gender || null, b.address || null, b.city || null, b.state || null, b.zip || null,
         b.emergencyContact || null, b.insuranceProvider || null, b.insuranceId || null, b.notes || null, p.id);
  if (b.name || b.phone) {
    db.prepare(`UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?`)
      .run(b.name || null, b.phone || null, req.user.uid);
  }
  audit(req, 'patient.update', 'patient', p.id);
  ok(res, {});
});

/* =========================================================
   PATIENT QR (permanent) + APPOINTMENT QR
   ========================================================= */
router.get('/patients/me/qr', requireAuth, requireRole('patient'), async (req, res) => {
  const p = patientOfUser(req.user.uid);
  if (!p) return fail(res, 404, 'Patient not found');
  const url = qr.patientQrUrl(p.patient_qr_token);
  const image = await qr.qrDataUrl(url, { width: 480 });
  ok(res, { url, image, token: p.patient_qr_token });
});

router.post('/patients/me/qr/regenerate', requireAuth, requireRole('patient'), async (req, res) => {
  const p = patientOfUser(req.user.uid);
  if (!p) return fail(res, 404, 'Patient not found');
  const newToken = qr.newPatientQrToken();
  db.prepare(`UPDATE patients SET patient_qr_token = ? WHERE id = ?`).run(newToken, p.id);
  const url = qr.patientQrUrl(newToken);
  const image = await qr.qrDataUrl(url, { width: 480 });
  audit(req, 'patient.qr.regenerate', 'patient', p.id);
  ok(res, { url, image, token: newToken });
});

router.get('/appointments/:id/qr', requireAuth, async (req, res) => {
  const row = db.prepare(`
    SELECT a.*, p.user_id AS patient_user_id FROM appointments a
    JOIN patients p ON p.id = a.patient_id WHERE a.id = ?
  `).get(req.params.id);
  if (!row) return fail(res, 404, 'Appointment not found');
  if (req.user.role === 'patient' && row.patient_user_id !== req.user.uid) return fail(res, 403, 'Access denied');
  const url = qr.appointmentQrUrl(row.checkin_token);
  const image = await qr.qrDataUrl(url, { width: 480 });
  ok(res, { url, image, reference: row.reference });
});

/* =========================================================
   SCAN / VERIFY endpoints
   ========================================================= */
router.get('/verify/appointment/:token', (req, res) => {
  const row = db.prepare(`
    SELECT a.id, a.reference, a.appointment_date, a.time_slot, a.status, a.checked_in_at,
           a.checkin_token_expires_at,
           d.name AS doctor_name, d.specialty AS doctor_specialty,
           s.name AS service_name, s.category AS service_category,
           u.name AS patient_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN users u ON u.id = p.user_id
    LEFT JOIN doctors d ON d.id = a.doctor_id
    LEFT JOIN services s ON s.id = a.service_id
    WHERE a.checkin_token = ?
  `).get(req.params.token);
  if (!row) return fail(res, 404, 'Invalid QR code');
  if (row.checkin_token_expires_at && new Date(row.checkin_token_expires_at) < new Date()) {
    return fail(res, 410, 'This QR code has expired');
  }
  const limited = {
    id: row.id,
    reference: row.reference,
    appointment_date: row.appointment_date,
    time_slot: row.time_slot,
    status: row.status,
    checked_in_at: row.checked_in_at,
    doctor_name: row.doctor_name,
    doctor_specialty: row.doctor_specialty,
    service_name: row.service_name,
    service_category: row.service_category,
    patient_name: row.patient_name
  };
  ok(res, { appointment: limited });
});

router.post('/verify/appointment/:token/checkin', requireAuth, requireRole('admin','staff'), (req, res) => {
  const row = db.prepare(`SELECT * FROM appointments WHERE checkin_token = ?`).get(req.params.token);
  if (!row) return fail(res, 404, 'Invalid QR code');
  if (row.checkin_token_expires_at && new Date(row.checkin_token_expires_at) < new Date()) return fail(res, 410, 'QR code expired');
  if (row.checked_in_at) return fail(res, 409, 'Already checked in');
  db.prepare(`UPDATE appointments SET checked_in_at = datetime('now'), status = CASE WHEN status='pending' THEN 'confirmed' ELSE status END, updated_at = datetime('now') WHERE id = ?`).run(row.id);
  audit(req, 'appointment.checkin', 'appointment', row.id);
  ok(res, { checked_in_at: new Date().toISOString(), reference: row.reference });
});

/* Login via patient QR (magic link) */
router.post('/qr/patient-login', (req, res) => {
  const { token } = req.body || {};
  if (!token) return fail(res, 400, 'Missing token');
  const p = db.prepare(`
    SELECT p.id, u.id AS user_id, u.email, u.role, u.name FROM patients p
    JOIN users u ON u.id = p.user_id WHERE p.patient_qr_token = ?
  `).get(token);
  if (!p) return fail(res, 404, 'Invalid QR code');
  const jwtToken = signToken({ id: p.user_id, role: p.role, email: p.email });
  setSessionCookie(res, jwtToken);
  audit({ user: { uid: p.user_id }, ip: req.ip }, 'qr.login', 'patient', p.id);
  ok(res, { user: { id: p.user_id, email: p.email, role: p.role, name: p.name } });
});

/* =========================================================
   ADMIN / STATS
   ========================================================= */
router.get('/admin/stats', requireAuth, requireRole('admin','staff'), (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const totalPatients = db.prepare(`SELECT COUNT(*) c FROM patients`).get().c;
  const totalDoctors = db.prepare(`SELECT COUNT(*) c FROM doctors WHERE active=1`).get().c;
  const totalAppointments = db.prepare(`SELECT COUNT(*) c FROM appointments`).get().c;
  const todayAppts = db.prepare(`SELECT COUNT(*) c FROM appointments WHERE appointment_date = ?`).get(today).c;
  const upcoming = db.prepare(`SELECT COUNT(*) c FROM appointments WHERE appointment_date >= ? AND status IN ('pending','confirmed','rescheduled')`).get(today).c;
  const completed = db.prepare(`SELECT COUNT(*) c FROM appointments WHERE status='completed'`).get().c;
  const pending = db.prepare(`SELECT COUNT(*) c FROM appointments WHERE status='pending'`).get().c;
  const revenueRow = db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status='paid'`).get();
  const byDay = db.prepare(`
    SELECT appointment_date AS d, COUNT(*) c FROM appointments
    WHERE appointment_date >= date('now','-13 days')
    GROUP BY appointment_date ORDER BY appointment_date
  `).all();
  ok(res, {
    stats: { totalPatients, totalDoctors, totalAppointments, todayAppts, upcoming, completed, pending, revenue: revenueRow.s },
    byDay
  });
});

router.get('/admin/patients', requireAuth, requireRole('admin','staff'), (req, res) => {
  const q = (req.query.q || '').trim();
  const rows = q
    ? db.prepare(`
        SELECT p.id, u.name, u.email, u.phone, p.dob, p.created_at,
          (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id) AS appt_count
        FROM patients p JOIN users u ON u.id = p.user_id
        WHERE u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?
        ORDER BY p.created_at DESC LIMIT 200
      `).all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare(`
        SELECT p.id, u.name, u.email, u.phone, p.dob, p.created_at,
          (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id) AS appt_count
        FROM patients p JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC LIMIT 200
      `).all();
  ok(res, { patients: rows });
});

router.get('/admin/patients/:id', requireAuth, requireRole('admin','staff'), (req, res) => {
  const row = db.prepare(`
    SELECT p.*, u.name, u.email, u.phone, u.created_at AS user_created
    FROM patients p JOIN users u ON u.id = p.user_id WHERE p.id = ?
  `).get(req.params.id);
  if (!row) return fail(res, 404, 'Patient not found');
  const appts = db.prepare(`
    SELECT a.*, d.name AS doctor_name, s.name AS service_name
    FROM appointments a LEFT JOIN doctors d ON d.id = a.doctor_id
    LEFT JOIN services s ON s.id = a.service_id
    WHERE a.patient_id = ? ORDER BY a.appointment_date DESC
  `).all(row.id);
  const reports = db.prepare(`SELECT id, title, report_date FROM reports WHERE patient_id = ? ORDER BY report_date DESC`).all(row.id);
  const prescriptions = db.prepare(`SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY issued_date DESC`).all(row.id);
  ok(res, { patient: row, appointments: appts, reports, prescriptions });
});

module.exports = router;
/* Add inside src/routes.js */
router.post('/admin/appointments', requireAuth, requireRole('admin','staff'), async (req, res) => {
  const { patientId, doctorId, serviceId, date, time, reason } = req.body || {};
  if (!patientId || !doctorId || !serviceId || !date || !time) return fail(res, 400, 'Missing required fields');
  const clash = db.prepare(`
    SELECT id FROM appointments WHERE doctor_id=? AND appointment_date=? AND time_slot=?
      AND status IN ('pending','confirmed','rescheduled')
  `).get(doctorId, date, time);
  if (clash) return fail(res, 409, 'That time slot is already booked');
  const token = qr.newAppointmentQrToken();
  const expires = new Date(date + 'T23:59:59'); expires.setDate(expires.getDate() + 30);
  const info = db.prepare(`
    INSERT INTO appointments (reference, patient_id, doctor_id, service_id, appointment_date, time_slot, status, reason, checkin_token, checkin_token_expires_at)
    VALUES (?,?,?,?,?,?, 'confirmed', ?, ?, ?)
  `).run(apptRef(), patientId, doctorId, serviceId, date, time, reason || null, token, expires.toISOString());
  const pu = db.prepare(`SELECT user_id FROM patients WHERE id = ?`).get(patientId);
  if (pu) notify(pu.user_id, 'appointment', 'Appointment confirmed', `Your appointment on ${date} at ${time} is confirmed.`, '/portal.html#appointments');
  audit(req, 'admin.appointment.create', 'appointment', info.lastInsertRowid);
  ok(res, { appointment: { id: info.lastInsertRowid } });
});