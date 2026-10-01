(() => {
  const result = document.getElementById('result');
  const urlParam = new URLSearchParams(location.search).get('a');
  let handled = false;

  async function verify(token) {
    if (handled) return; handled = true;
    result.innerHTML = UI.skeleton(2);
    try {
      const { appointment } = await API.get(`/verify/appointment/${encodeURIComponent(token)}`);
      result.innerHTML = `
        <div class="card" style="text-align:left;border-left:4px solid var(--brand-500)">
          <h3>${UI.escape(appointment.patient_name)}</h3>
          <p class="muted">Ref <strong>${appointment.reference}</strong></p>
          <p style="margin:.25rem 0"><strong>${UI.fmtDate(appointment.appointment_date)}</strong> · ${UI.fmtTime(appointment.time_slot)}</p>
          <p style="margin:.25rem 0">${UI.escape(appointment.doctor_name || '—')}</p>
          <p style="margin:.25rem 0" class="muted">${UI.escape(appointment.service_name || '')}</p>
          <p>${UI.statusChip(appointment.status)}</p>
          ${appointment.checked_in_at
            ? `<div class="chip chip--completed">Already checked in at ${new Date(appointment.checked_in_at).toLocaleTimeString()}</div>`
            : `<button class="btn btn--primary btn--full" id="checkinBtn" style="margin-top:.75rem">Confirm check-in</button>`}
        </div>`;
      const btn = document.getElementById('checkinBtn');
      if (btn) btn.onclick = async () => {
        btn.disabled = true; btn.textContent = 'Checking in…';
        try { await API.post(`/verify/appointment/${encodeURIComponent(token)}/checkin`, {}); UI.toast('Checked in', 'Patient verified.', 'success'); verify(token); }
        catch (e) { UI.toast('Error', e.message, 'error'); btn.disabled = false; btn.textContent = 'Confirm check-in'; handled = false; }
      };
    } catch (e) {
      result.innerHTML = `<div class="card" style="text-align:left;border-left:4px solid var(--danger-500)">
        <h3>Invalid QR</h3><p class="muted">${UI.escape(e.message)}</p></div>`;
      handled = false;
    }
  }

  // Magic-link style: /scan.html?a=<token>
  if (urlParam) verify(urlParam);

  document.getElementById('manualBtn').onclick = () => {
    const raw = document.getElementById('manualToken').value.trim();
    const token = raw.split('/').filter(Boolean).pop();
    if (token) verify(token);
  };

  if (window.Html5Qrcode) {
    const scanner = new Html5Qrcode('reader');
    Html5Qrcode.getCameras().then(cameras => {
      if (!cameras || !cameras.length) return;
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        decoded => {
          const token = decoded.split('/').filter(Boolean).pop();
          if (token) { scanner.stop().catch(() => {}); verify(token); }
        },
        () => {}
      ).catch(err => {
        result.innerHTML = `<p class="muted" style="font-size:.85rem">Camera unavailable: ${UI.escape(err.message || err)}. Use manual entry below.</p>`;
      });
    }).catch(() => {});
  }
})();