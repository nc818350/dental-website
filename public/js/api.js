// Shared fetch wrapper + UI utilities
const API = {
  async req(path, opts = {}) {
    const res = await fetch('/api' + path, {
      credentials: 'same-origin',
      headers: opts.body && !(opts.body instanceof FormData)
        ? { 'Content-Type': 'application/json', ...(opts.headers || {}) }
        : { ...(opts.headers || {}) },
      ...opts,
      body: opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string'
        ? JSON.stringify(opts.body) : opts.body
    });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },
  get(p)         { return this.req(p); },
  post(p, b)     { return this.req(p, { method: 'POST', body: b }); },
  put(p, b)      { return this.req(p, { method: 'PUT', body: b }); },
  del(p)         { return this.req(p, { method: 'DELETE' }); }
};

const UI = {
  toast(title, message = '', type = 'info', ms = 4200) {
    const host = document.getElementById('toasts') || (() => {
      const h = document.createElement('div'); h.className = 'toast-host'; h.id = 'toasts';
      document.body.appendChild(h); return h;
    })();
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<p>${escapeHtml(message)}</p>` : ''}`;
    host.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; setTimeout(() => el.remove(), 300); }, ms);
  },
  modal({ title, body, actions = [] }) {
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${escapeHtml(title || '')}</h3>
        <div class="modal__body">${body || ''}</div>
        <div style="display:flex;gap:.6rem;justify-content:flex-end;margin-top:1.5rem" class="modal__actions"></div>
      </div>`;
    const actions_el = bd.querySelector('.modal__actions');
    actions.forEach(a => {
      const b = document.createElement('button');
      b.className = `btn ${a.class || 'btn--ghost'}`;
      b.textContent = a.label;
      b.onclick = () => { if (a.onClick) a.onClick(bd); else close(); };
      actions_el.appendChild(b);
    });
    const close = () => { bd.classList.remove('show'); setTimeout(() => bd.remove(), 250); };
    bd.addEventListener('click', e => { if (e.target === bd) close(); });
    document.addEventListener('keydown', function esc(e){ if (e.key === 'Escape'){ close(); document.removeEventListener('keydown', esc);} });
    document.body.appendChild(bd);
    requestAnimationFrame(() => bd.classList.add('show'));
    return { close, el: bd };
  },
  confirm(message, title = 'Are you sure?') {
    return new Promise(resolve => {
      const m = UI.modal({
        title,
        body: `<p>${escapeHtml(message)}</p>`,
        actions: [
          { label: 'Cancel', class: 'btn--ghost', onClick: () => { m.close(); resolve(false); } },
          { label: 'Confirm', class: 'btn--primary', onClick: () => { m.close(); resolve(true); } }
        ]
      });
    });
  },
  skeleton(rows = 3) {
    return Array.from({ length: rows }).map(() => `<div class="skeleton" style="height:60px;margin-bottom:.75rem"></div>`).join('');
  },
  statusChip(status) {
    return `<span class="chip chip--${status}">${status[0].toUpperCase() + status.slice(1)}</span>`;
  },
  fmtDate(d) {
    if (!d) return '—';
    const x = new Date(d);
    return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  fmtTime(t) {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2,'0')} ${ampm}`;
  },
  escape: escapeHtml
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
});