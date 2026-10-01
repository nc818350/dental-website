/* ============================================================
   SmileCare — Admin / Staff Dashboard
   ============================================================ */
(() => {
  const root = document.getElementById('root');
  const state = { me: null, section: 'dashboard' };

  async function boot() {
    try {
      const { user } = await API.get('/auth/me');
      if (!['admin','staff'].includes(user.role)) {
        location.href = user.role === 'patient' ? 'portal.html' : 'index.html';
        return;
      }
      state.me = user;
      renderShell();
      navigate(location.hash.slice(1) || 'dashboard');
    } catch {
      renderAuth();
    }
  }

  function renderAuth() {
    root.innerHTML = `
    <div class="auth-wrap">
      <div style="position:absolute;top:1.25rem;left:1.25rem"><a class="btn btn--ghost btn--sm" href="index.html">← Site</a></div>
      <div class="auth-card">
        <div class="brand" style="margin-bottom:1.5rem">
          <span class="brand__mark">S</span>
          <span class="brand__name"><strong>SmileCare</strong><span>Clinic Dashboard</span></span>
        </div>
        <h1>Staff sign in</h1>
        <p class="lead">Authorized clinic staff only.</p>
        <form id="loginForm">
          <div class="form-group"><label class="form-label" for="aEmail">Email</label><input class="form-control" id="aEmail" type="email" required></div>
          <div class="form-group"><label class="form-label" for="aPass">Password</label><input class="form-control" id="aPass" type="password" required></div>
          <button class="btn btn--primary btn--lg btn--full" type="submit">Sign in</button>
        </form>
      </div>
    </div>`;
    document.getElementById('loginForm').onsubmit = async e => {
      e.preventDefault();
      const b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Signing in…';
      try {
        await API.post('/auth/login', { email: document.getElementById('aEmail').value, password: document.getElementById('aPass').value });
        location.reload();
      } catch (err) { UI.toast('Sign-in failed', err.message, 'error'); b.disabled = false; b.textContent = 'Sign in'; }
    };
  }

  function renderShell() {
    root.innerHTML = `
    <div class="dash">
      <aside class="dash__side" id="side">
        <div class="dash__brand"><span class="brand__mark">S</span>
          <span><strong style="color:#fff;display:block">SmileCare</strong><span style="font-size:.7rem;color:#94a3b8;letter-spacing:.06em;text-transform:uppercase">Clinic Dashboard</span></span>
        </div>
        <nav class="dash__nav">
          ${item('dashboard','📊','Overview')}
          ${item('appointments','📅','Appointments')}
          ${item('patients','👥','Patients')}
          ${item('scan','📷','Scan QR')}
          ${item('reports','📄','Reports')}
          ${item('prescriptions','💊','Prescriptions')}
          <hr style="border-color:#1e293b;margin:.75rem 0">
          <a href="index.html">🏠 Site</a>
          <a href="#" id="logoutLink">↩ Sign out</a>
        </nav>
      </aside>
      <main class="dash__main">
        <div class="dash-mobile-top"><button class="menu-btn" id="sideToggle">☰</button><strong>Clinic Dashboard</strong></div>
        <div class="dash__top">
          <div class="dash__title"><h1 id="pageTitle">Overview</h1><p id="pageSub">Clinic performance at a glance.</p></div>
          <div style="display:flex;gap:.5rem" id="topActions"></div>
        </div>
        <div id="section"></div>
      </main>
    </div>`;

    document.getElementById('sideToggle')?.addEventListener('click', () => document.getElementById('side').classList.toggle('open'));
    document.getElementById('logoutLink').addEventListener('click', async e => { e.preventDefault(); await API.post('/auth/logout', {}); location.href = 'index.html'; });
  }
  function item(id, icon, label) { return `<a href="#${id}" data-section="${id}" class="${state.section===id?'active':''}">${icon} ${label}</a>`; }

  function navigate(section) {
    state.section = section;
    document.querySelectorAll('[data-section]').forEach(a => a.classList.toggle('active', a.dataset.section === section));
    document.getElementById('side').classList.remove('open');
    history.replaceState({}, '', '#' + section);
    const map = { dashboard: renderDashboard, appointments: renderAppointments, patients: renderPatients, scan: renderScan, reports: renderReports, prescriptions: renderPrescriptions };
    (map[section] || renderDashboard)();
  }

  function setTitle(t, s) { document.getElementById('pageTitle').textContent = t; document.getElementById('pageSub').textContent = s || ''; document.title = t + ' — SmileCare Admin'; }

  /* ---------------- DASHBOARD ---------------- */
  async function renderDashboard() {
    setTitle('Overview', 'Clinic performance at a glance.');
    document.getElementById('topActions').innerHTML = `<a class="btn btn--primary" href="#appointments">View appointments</a>`;
    const s = document.getElementById('section');
    s.innerHTML = UI.skeleton(4);
    try {
      const { stats, byDay } = await API.get('/admin/stats');
      const max = Math.max(...byDay.map(d => d.c), 1);
      s.innerHTML = `
        <div class="dash-grid dash-grid--4">
          <div class="kpi"><div class="kpi__label">Total patients</div><div class="kpi__value">${stats.totalPatients}</div></div>
          <div class="kpi"><div class="kpi__label">Today</div><div class="kpi__value">${stats.todayAppts}</div></div>
          <div class="kpi"><div class="kpi__label">Upcoming</div><div class="kpi__value">${stats.upcoming}</div></div>
          <div class="kpi"><div class="kpi__label">Revenue</div><div class="kpi__value">$${Number(stats.revenue||0).toLocaleString()}</div></div>
        </div>
        <div class="dash-grid dash-grid--4" style="margin-top:1rem">
          <div class="kpi"><div class="kpi__label">Completed</div><div class="kpi__value">${stats.completed}</div></div>
          <div class="kpi"><div class="kpi__label">Pending</div><div class="kpi__value">${stats.pending}</div></div>
          <div class="kpi"><div class="kpi__label">Doctors</div><div class="kpi__value">${stats.totalDoctors}</div></div>
          <div class="kpi"><div class="kpi__label">All-time appointments</div><div class="kpi__value">${stats.totalAppointments}</div></div>
        </div>
        <div class="card" style="margin-top:1.5rem">
          <h3 style="margin-bottom:1rem">Appointments · last 14 days</h3>
          <div style="display:flex;align-items:flex-end;gap:.5rem;height:180px">
            ${byDay.map(d => `<div title="${d.d}: ${d.c}" style="flex:1;background:linear-gradient(180deg,var(--brand-500),var(--brand-700));height:${(d.c/max)*100}%;border-radius:6px 6px 0 0;min-height:4px;position:relative">
              <span style="position:absolute;bottom:-22px;left:0;right:0;text-align:center;font-size:.7rem;color:var(--ink-500)">${d.d.slice(5)}</span>
            </div>`).join('')}
          </div>
        </div>`;
    } catch (e) { s.innerHTML = `<div class="card"><p>${UI.escape(e.message)}</p></div>`; }
  }

  /* ---------------- APPOINTMENTS ---------------- */
  async function renderAppointments() {
    setTitle('Appointments', 'Manage, confirm, reschedule and check in patients.');
    document.getElementById('topActions').innerHTML = `<button class="btn btn--primary" id="newAppt">+ New appointment</button>`;
    const s = document.getElementById('section');
    s.innerHTML = UI.skeleton(4);

    const load = async () => {
      const { appointments } = await API.get('/appointments');
      if (!appointments.length) return s.innerHTML = `<div class="card empty">No appointments yet.</div>`;
      s.innerHTML = `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>#</th><th>Patient</th><th>Date</th><th>Service</th><th>Doctor</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${appointments.map(a => `
            <tr>
              <td data-label="#">${a.id}</td>
              <td data-label="Patient"><strong>${UI.escape(a.patient_name||'')}</strong><br><span class="muted" style="font-size:.78rem">${UI.escape(a.patient_email||'')}</span></td>
              <td data-label="Date">${UI.fmtDate(a.appointment_date)}<br><span class="muted">${UI.fmtTime(a.time_slot)}</span></td>
              <td data-label="Service">${UI.escape(a.service_name || '—')}</td>
              <td data-label="Doctor">${UI.escape(a.doctor_name || '—')}</td>
              <td data-label="Status">${UI.statusChip(a.status)}${a.checked_in_at ? ' <span class="chip chip--completed" style="margin-left:.25rem">checked in</span>' : ''}</td>
              <td data-label="Actions">
                <select class="form-control" style="width:auto;display:inline-block;padding:.35rem .6rem;font-size:.85rem" data-act="status" data-id="${a.id}">
                  ${['pending','confirmed','completed','cancelled','rescheduled'].map(st => `<option ${st===a.status?'selected':''} value="${st}">${st}</option>`).join('')}
                </select>
              </td>
            </tr>`).join('')}</tbody>
        </table></div>`;

      s.querySelectorAll('[data-act="status"]').forEach(sel => sel.onchange = async () => {
        try { await API.post(`/appointments/${sel.dataset.id}/status`, { status: sel.value }); UI.toast('Updated', '', 'success'); }
        catch (e) { UI.toast('Error', e.message, 'error'); }
      });
    };
    try { await load(); } catch (e) { s.innerHTML = `<div class="card"><p>${UI.escape(e.message)}</p></div>`; }

    document.getElementById('newAppt').onclick = async () => {
      const { patients } = await API.get('/admin/patients?q=');
      const { doctors } = await API.get('/doctors');
      const { services } = await API.get('/services');
      const html = `
        <div class="form-group"><label class="form-label">Patient</label>
          <select class="form-control" id="naPatient">${patients.map(p => `<option value="${p.id}">${UI.escape(p.name)} (${UI.escape(p.email)})</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Service</label>
          <select class="form-control" id="naService">${services.map(s => `<option value="${s.id}">${UI.escape(s.name)}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Doctor</label>
          <select class="form-control" id="naDoctor">${doctors.map(d => `<option value="${d.id}">${UI.escape(d.name)}</option>`).join('')}</select>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Date</label><input class="form-control" id="naDate" type="date" min="${new Date().toISOString().slice(0,10)}"></div>
          <div class="form-group"><label class="form-label">Time</label><input class="form-control" id="naTime" type="time" value="09:00"></div>
        </div>
        <div class="form-group"><label class="form-label">Reason</label><textarea class="form-control" id="naReason" rows="2"></textarea></div>
        <p class="muted" style="font-size:.8rem">Note: staff-created appointments are marked <strong>confirmed</strong> immediately.</p>`;
      const m = UI.modal({ title: 'New appointment', body: html, actions: [
        { label: 'Cancel', class: 'btn--ghost' },
        { label: 'Create', class: 'btn--primary', onClick: async bd => {
          try {
            // Create via API using admin credentials — call a generic endpoint
            const res = await API.post('/admin/appointments', {
              patientId: bd.querySelector('#naPatient').value,
              serviceId: bd.querySelector('#naService').value,
              doctorId: bd.querySelector('#naDoctor').value,
              date: bd.querySelector('#naDate').value,
              time: bd.querySelector('#naTime').value,
              reason: bd.querySelector('#naReason').value
            });
            UI.toast('Appointment created', `Reference #${res.appointment.id}`, 'success');
            m.close(); load();
          } catch (e) { UI.toast('Error', e.message, 'error'); }
        } }
      ]});
    };
  }

  /* ---------------- PATIENTS ---------------- */
  async function renderPatients() {
    setTitle('Patients', 'Search and manage patient records.');
    document.getElementById('topActions').innerHTML = ``;
    const s = document.getElementById('section');
    s.innerHTML = `
      <div class="card" style="margin-bottom:1rem">
        <input class="form-control" id="pSearch" placeholder="Search by name, email or phone…">
      </div>
      <div id="patientsList">${UI.skeleton(3)}</div>`;

    const load = async q => {
      const { patients } = await API.get('/admin/patients?q=' + encodeURIComponent(q || ''));
      const host = document.getElementById('patientsList');
      if (!patients.length) return host.innerHTML = `<div class="card empty">No patients found.</div>`;
      host.innerHTML = `<div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Visits</th><th></th></tr></thead>
        <tbody>${patients.map(p => `
          <tr>
            <td data-label="Name"><strong>${UI.escape(p.name)}</strong></td>
            <td data-label="Email">${UI.escape(p.email)}</td>
            <td data-label="Phone">${UI.escape(p.phone || '—')}</td>
            <td data-label="Visits">${p.appt_count}</td>
            <td data-label="Actions"><button class="btn btn--outline btn--sm" data-id="${p.id}">Open</button></td>
          </tr>`).join('')}</tbody></table></div>`;
      host.querySelectorAll('[data-id]').forEach(b => b.onclick = () => openPatient(b.dataset.id));
    };
    const input = document.getElementById('pSearch');
    let t; input.oninput = () => { clearTimeout(t); t = setTimeout(() => load(input.value), 250); };
    try { await load(''); } catch (e) { document.getElementById('patientsList').innerHTML = `<div class="card"><p>${UI.escape(e.message)}</p></div>`; }
  }

  async function openPatient(id) {
    try {
      const { patient, appointments, reports, prescriptions } = await API.get(`/admin/patients/${id}`);
      const body = `
        <div style="display:flex;gap:1rem;align-items:center;margin-bottom:1rem">
          <div class="brand__mark" style="width:52px;height:52px;font-size:1.25rem">${UI.escape(patient.name[0])}</div>
          <div><strong>${UI.escape(patient.name)}</strong><br><span class="muted" style="font-size:.85rem">${UI.escape(patient.email)}${patient.phone ? ' · ' + UI.escape(patient.phone) : ''}</span></div>
        </div>
        <div class="dash-grid dash-grid--3" style="grid-template-columns:repeat(3,1fr);gap:.5rem">
          <div class="kpi" style="padding:.75rem"><div class="kpi__label">Visits</div><div class="kpi__value" style="font-size:1.2rem">${appointments.length}</div></div>
          <div class="kpi" style="padding:.75rem"><div class="kpi__label">Reports</div><div class="kpi__value" style="font-size:1.2rem">${reports.length}</div></div>
          <div class="kpi" style="padding:.75rem"><div class="kpi__label">Rx</div><div class="kpi__value" style="font-size:1.2rem">${prescriptions.length}</div></div>
        </div>
        <h4 style="margin:1.25rem 0 .5rem">Recent appointments</h4>
        <div style="max-height:220px;overflow:auto">${appointments.slice(0,8).map(a => `
          <div style="padding:.6rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;font-size:.85rem">
            <span>${UI.fmtDate(a.appointment_date)} ${UI.fmtTime(a.time_slot)}</span>
            <span>${UI.statusChip(a.status)}</span>
          </div>`).join('') || '<p class="muted">None</p>'}</div>`;
      UI.modal({ title: 'Patient record', body, actions: [{ label: 'Close', class: 'btn--primary' }] });
    } catch (e) { UI.toast('Error', e.message, 'error'); }
  }

  /* ---------------- SCAN ---------------- */
  async function renderScan() {
    setTitle('Scan QR', 'Verify appointments and check patients in.');
    document.getElementById('topActions').innerHTML = `<a class="btn btn--outline" href="scan.html" target="_blank">Open full-screen scanner</a>`;
    const s = document.getElementById('section');
    s.innerHTML = `
      <div class="card" style="max-width:640px">
        <h3>Manual verification</h3>
        <p class="muted">Paste the appointment QR token or full QR URL below to verify and check in.</p>
        <div class="form-group">
          <label class="form-label">QR token or URL</label>
          <input class="form-control" id="scanInput" placeholder="ap_… or http://…/a/ap_…">
        </div>
        <button class="btn btn--primary" id="verifyBtn">Verify</button>
        <div id="scanResult" style="margin-top:1rem"></div>
      </div>`;
    document.getElementById('verifyBtn').onclick = async () => {
      const raw = document.getElementById('scanInput').value.trim();
      const token = raw.split('/').filter(Boolean).pop();
      if (!token) return;
      const host = document.getElementById('scanResult');
      host.innerHTML = UI.skeleton(2);
      try {
        const { appointment } = await API.get(`/verify/appointment/${encodeURIComponent(token)}`);
        host.innerHTML = `
          <div class="card" style="border-left:4px solid var(--brand-500)">
            <h3>${UI.escape(appointment.patient_name)}</h3>
            <p class="muted">Ref <strong>${appointment.reference}</strong></p>
            <p><strong>Date:</strong> ${UI.fmtDate(appointment.appointment_date)} · ${UI.fmtTime(appointment.time_slot)}</p>
            <p><strong>Doctor:</strong> ${UI.escape(appointment.doctor_name || '—')}</p>
            <p><strong>Service:</strong> ${UI.escape(appointment.service_name || '—')}</p>
            <p>${UI.statusChip(appointment.status)}</p>
            ${appointment.checked_in_at ? `<p class="chip chip--completed">Checked in ${new Date(appointment.checked_in_at).toLocaleTimeString()}</p>` :
              `<button class="btn btn--primary" id="checkinBtn">Confirm check-in</button>`}
          </div>`;
        const btn = document.getElementById('checkinBtn');
        if (btn) btn.onclick = async () => {
          try { await API.post(`/verify/appointment/${encodeURIComponent(token)}/checkin`, {}); UI.toast('Checked in', '', 'success'); renderScan(); }
          catch (e) { UI.toast('Error', e.message, 'error'); }
        };
      } catch (e) { host.innerHTML = `<div class="card" style="border-left:4px solid var(--danger-500)"><p>${UI.escape(e.message)}</p></div>`; }
    };
  }

  /* ---------------- REPORTS ---------------- */
  async function renderReports() {
    setTitle('Reports', 'Upload and manage patient reports.');
    document.getElementById('topActions').innerHTML = `<button class="btn btn--primary" id="newReport">+ Upload report</button>`;
    const s = document.getElementById('section');
    s.innerHTML = UI.skeleton(3);
    try {
      const { reports } = await API.get('/reports');
      if (!reports.length) s.innerHTML = `<div class="card empty">No reports yet.</div>`;
      else s.innerHTML = `<div class="table-wrap"><table class="table">
        <thead><tr><th>Patient</th><th>Title</th><th>Date</th><th>File</th><th></th></tr></thead>
        <tbody>${reports.map(r => `<tr>
          <td data-label="Patient">${UI.escape(r.patient_name||'')}</td>
          <td data-label="Title">${UI.escape(r.title)}</td>
          <td data-label="Date">${UI.fmtDate(r.report_date)}</td>
          <td data-label="File">${r.file_name ? UI.escape(r.file_name) : '—'}</td>
          <td data-label="Actions">
            ${r.file_name ? `<a class="btn btn--outline btn--sm" href="/api/reports/${r.id}/download" target="_blank">Open</a>` : ''}
            <button class="btn btn--danger btn--sm" data-del="${r.id}">Delete</button>
          </td></tr>`).join('')}</tbody></table></div>`;
      s.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (!(await UI.confirm('Delete this report permanently?'))) return;
        try { await API.del(`/reports/${b.dataset.del}`); UI.toast('Deleted', '', 'success'); renderReports(); }
        catch (e) { UI.toast('Error', e.message, 'error'); }
      });
    } catch (e) { s.innerHTML = `<div class="card"><p>${UI.escape(e.message)}</p></div>`; }

    document.getElementById('newReport').onclick = async () => {
      const { patients } = await API.get('/admin/patients?q=');
      const html = `
        <form id="uploadForm">
          <div class="form-group"><label class="form-label">Patient</label>
            <select class="form-control" name="patientId">${patients.map(p => `<option value="${p.id}">${UI.escape(p.name)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Title</label><input class="form-control" name="title" required></div>
          <div class="form-group"><label class="form-label">Report date</label><input class="form-control" type="date" name="reportDate" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="form-group"><label class="form-label">Description</label><textarea class="form-control" name="description" rows="2"></textarea></div>
          <div class="form-group"><label class="form-label">File (PDF / image)</label><input class="form-control" type="file" name="file" accept=".pdf,image/*"></div>
        </form>`;
      const m = UI.modal({ title: 'Upload report', body: html, actions: [
        { label: 'Cancel', class: 'btn--ghost' },
        { label: 'Upload', class: 'btn--primary', onClick: async bd => {
          const form = bd.querySelector('#uploadForm');
          const fd = new FormData(form);
          if (!fd.get('title')) return UI.toast('Title required', '', 'error');
          try {
            await fetch('/api/reports', { method: 'POST', body: fd, credentials: 'same-origin' }).then(async r => {
              const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Upload failed');
            });
            UI.toast('Uploaded', '', 'success'); m.close(); renderReports();
          } catch (e) { UI.toast('Error', e.message, 'error'); }
        } }
      ]});
    };
  }

  /* ---------------- PRESCRIPTIONS ---------------- */
  async function renderPrescriptions() {
    setTitle('Prescriptions', 'Issue prescriptions to patients.');
    document.getElementById('topActions').innerHTML = `<button class="btn btn--primary" id="newRx">+ New prescription</button>`;
    const s = document.getElementById('section');
    s.innerHTML = UI.skeleton(3);
    try {
      const { prescriptions } = await API.get('/prescriptions');
      s.innerHTML = prescriptions.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Patient</th><th>Medications</th><th>Doctor</th><th>Issued</th></tr></thead>
        <tbody>${prescriptions.map(p => `<tr>
          <td data-label="Patient">${UI.escape(p.patient_name||'')}</td>
          <td data-label="Medications">${UI.escape(p.medications)}</td>
          <td data-label="Doctor">${UI.escape(p.doctor_name||'—')}</td>
          <td data-label="Issued">${UI.fmtDate(p.issued_date)}</td>
        </tr>`).join('')}</tbody></table></div>` : `<div class="card empty">No prescriptions.</div>`;
    } catch (e) { s.innerHTML = `<div class="card"><p>${UI.escape(e.message)}</p></div>`; }

    document.getElementById('newRx').onclick = async () => {
      const { patients } = await API.get('/admin/patients?q=');
      const { doctors } = await API.get('/doctors');
      const html = `
        <div class="form-group"><label class="form-label">Patient</label>
          <select class="form-control" id="rxPatient">${patients.map(p => `<option value="${p.id}">${UI.escape(p.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Doctor</label>
          <select class="form-control" id="rxDoctor">${doctors.map(d => `<option value="${d.id}">${UI.escape(d.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Medications</label><input class="form-control" id="rxMeds" placeholder="e.g. Amoxicillin 500mg — 3x daily for 7 days"></div>
        <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="rxNotes" rows="2"></textarea></div>
        <div class="form-group"><label class="form-label">Issued date</label><input class="form-control" type="date" id="rxDate" value="${new Date().toISOString().slice(0,10)}"></div>`;
      const m = UI.modal({ title: 'New prescription', body: html, actions: [
        { label: 'Cancel', class: 'btn--ghost' },
        { label: 'Issue', class: 'btn--primary', onClick: async bd => {
          try {
            await API.post('/prescriptions', {
              patientId: bd.querySelector('#rxPatient').value,
              doctorId: bd.querySelector('#rxDoctor').value,
              medications: bd.querySelector('#rxMeds').value,
              notes: bd.querySelector('#rxNotes').value,
              issuedDate: bd.querySelector('#rxDate').value
            });
            UI.toast('Prescription issued', '', 'success'); m.close(); renderPrescriptions();
          } catch (e) { UI.toast('Error', e.message, 'error'); }
        } }
      ]});
    };
  }

  window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'dashboard'));
  document.addEventListener('DOMContentLoaded', boot);
})();