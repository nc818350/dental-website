const QRCode = require('qrcode');
const { randomToken } = require('./auth');

const PUBLIC_URL = () => (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');

function newPatientQrToken() { return 'pt_' + randomToken(24); }
function newAppointmentQrToken() { return 'ap_' + randomToken(20); }

function patientQrUrl(token) { return `${PUBLIC_URL()}/p/${token}`; }
function appointmentQrUrl(token) { return `${PUBLIC_URL()}/a/${token}`; }

async function qrDataUrl(url, opts = {}) {
  return QRCode.toDataURL(url, {
    width: opts.width || 420,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: opts.dark || '#0f172a', light: '#ffffff' }
  });
}

module.exports = {
  newPatientQrToken, newAppointmentQrToken,
  patientQrUrl, appointmentQrUrl, qrDataUrl
};