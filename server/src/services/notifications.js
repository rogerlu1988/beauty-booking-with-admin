// Notifications: Email via Nodemailer; SMS via Twilio. Falls back to console logging if not configured.
import nodemailer from 'nodemailer';
import twilio from 'twilio';

let transporter = null;
let smsClient = null;

function getEmailTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10) || 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function getSmsClient() {
  if (smsClient) return smsClient;
  const { TWILIO_SID, TWILIO_TOKEN } = process.env;
  if (!TWILIO_SID || !TWILIO_TOKEN) return null;
  smsClient = twilio(TWILIO_SID, TWILIO_TOKEN);
  return smsClient;
}

async function sendEmail({ to, subject, html, text, attachments }) {
  const { EMAIL_FROM } = process.env;
  const t = getEmailTransporter();
  if (!t || !EMAIL_FROM || !to) {
    console.log('[notify/email:FALLBACK]', { to, subject });
    return;
  }
  await t.sendMail({ from: EMAIL_FROM, to, subject, text, html, attachments });
}

async function sendSMS({ to, body }) {
  const c = getSmsClient();
  const { TWILIO_FROM } = process.env;
  if (!c || !TWILIO_FROM || !to) {
    console.log('[notify/sms:FALLBACK]', { to, body });
    return;
  }
  await c.messages.create({ from: TWILIO_FROM, to, body });
}

export async function notifyBookingCreated({ booking }) {
  const s = summary(booking);
  const subject = 'Your booking is confirmed';
  const text = `Your booking is confirmed for ${fmtDate(s.start)}.`;
  const html = emailTemplate('Booking confirmed', `Your booking is confirmed for <b>${fmtDate(s.start)}</b>.`);
  const attachments = [calendarAttachment({ booking })];
  await sendEmail({ to: s.clientEmail, subject, text, html, attachments });
  if (s.clientPhone) await sendSMS({ to: s.clientPhone, body: text });
  console.log('[notify] booking.created', s);
}

export async function notifyBookingCancelled({ booking }) {
  const s = summary(booking);
  const subject = 'Your booking was cancelled';
  const text = `Your booking for ${fmtDate(s.start)} was cancelled.`;
  const html = `<p>Your booking for <b>${fmtDate(s.start)}</b> was cancelled.</p>`;
  await sendEmail({ to: s.clientEmail, subject, text, html });
  if (s.clientPhone) await sendSMS({ to: s.clientPhone, body: text });
  console.log('[notify] booking.cancelled', s);
}

export async function notifyBookingRestored({ booking }) {
  const s = summary(booking);
  const subject = 'Your booking was restored';
  const text = `Your booking at ${fmtDate(s.start)} has been restored.`;
  const html = emailTemplate('Booking restored', `Your booking at <b>${fmtDate(s.start)}</b> has been restored.`);
  const attachments = [calendarAttachment({ booking })];
  await sendEmail({ to: s.clientEmail, subject, text, html, attachments });
  if (s.clientPhone) await sendSMS({ to: s.clientPhone, body: text });
  console.log('[notify] booking.restored', s);
}

export async function notifyBookingRescheduled({ booking, oldStart, oldEnd }) {
  const s = summary(booking);
  const subject = 'Your booking was rescheduled';
  const text = `Your booking was moved from ${fmtDate(oldStart)} to ${fmtDate(s.start)}.`;
  const html = emailTemplate('Booking rescheduled', `Your booking was moved from <b>${fmtDate(oldStart)}</b> to <b>${fmtDate(s.start)}</b>.`);
  const attachments = [calendarAttachment({ booking })];
  await sendEmail({ to: s.clientEmail, subject, text, html, attachments });
  if (s.clientPhone) await sendSMS({ to: s.clientPhone, body: text });
  console.log('[notify] booking.rescheduled', { ...s, oldStart, oldEnd });
}

export async function notifyBookingAssigned({ booking, professionalUserId }) {
  const s = summary(booking);
  const subject = 'Your booking was assigned to a professional';
  const text = `Your booking on ${fmtDate(s.start)} was assigned to a professional.`;
  const html = `<p>Your booking on <b>${fmtDate(s.start)}</b> was assigned to a professional.</p>`;
  await sendEmail({ to: s.clientEmail, subject, text, html });
  if (s.clientPhone) await sendSMS({ to: s.clientPhone, body: text });
  console.log('[notify] booking.assigned', { ...s, professionalUserId: String(professionalUserId || '') });
}

function summary(b) {
  return {
    id: String(b._id || ''),
    serviceId: b.serviceId ? String(b.serviceId) : undefined,
    start: b.start,
    end: b.end,
    status: b.status,
    clientEmail: b.clientEmail,
    clientPhone: b.clientPhone,
    professionalUserId: b.professionalUserId ? String(b.professionalUserId) : undefined,
  };
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

function emailTemplate(title, bodyHtml) {
  return `
  <div style="font-family: Arial, sans-serif; line-height:1.5; color:#222">
    <h2 style="margin:0 0 12px">${title}</h2>
    <div>${bodyHtml}</div>
    <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
    <p style="font-size:12px;color:#666">GlowUp Booking</p>
  </div>`;
}

function calendarAttachment({ booking }) {
  const ics = buildICS(booking);
  return {
    filename: 'booking.ics',
    content: ics,
    contentType: 'text/calendar; charset=utf-8',
  };
}

function buildICS(booking) {
  // Basic VCALENDAR with VEVENT for the booking
  const uid = String(booking._id || Math.random()).replace(/[^A-Za-z0-9-]/g, '') + '@glowup.local';
  const dtstamp = toICSDate(new Date());
  const dtstart = toICSDate(new Date(booking.start));
  const dtend = toICSDate(new Date(booking.end));
  const summary = 'GlowUp Appointment';
  const desc = 'Beauty service booking';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GlowUp//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(desc)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

function toICSDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}

function escapeICS(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
