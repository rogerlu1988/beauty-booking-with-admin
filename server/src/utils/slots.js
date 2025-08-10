/**
 * Generate available slots given:
 * - businessHours: { open: '09:00', close: '18:00' } // 24h local time strings
 * - stepMinutes: 30
 * - durationMinutes: e.g., 60
 * - date: 'YYYY-MM-DD'
 * - existing: array of { start: Date, end: Date }
 * Returns: array of ISO strings for slot start times.
 */
export function computeSlots({ businessHours, stepMinutes, durationMinutes, date, existing }) {
  const [openH, openM] = businessHours.open.split(':').map(n => parseInt(n, 10));
  const [closeH, closeM] = businessHours.close.split(':').map(n => parseInt(n, 10));

  const dayStart = new Date(date + 'T00:00:00');
  const open = new Date(dayStart); open.setHours(openH, openM, 0, 0);
  const close = new Date(dayStart); close.setHours(closeH, closeM, 0, 0);

  const slots = [];
  for (let t = new Date(open); t < close; t = new Date(t.getTime() + stepMinutes * 60000)) {
    const slotStart = new Date(t);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
    if (slotEnd > close) break;

    const overlaps = existing.some(b =>
      (slotStart < new Date(b.end) && slotEnd > new Date(b.start))
    );
    if (!overlaps) slots.push(slotStart.toISOString());
  }
  return slots;
}
