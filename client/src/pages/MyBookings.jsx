import React, { useEffect, useMemo, useState } from 'react';
import { Container, Typography, Tabs, Tab, Box, List, ListItem, ListItemText, Chip, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar } from '@mui/material';
import { api, rescheduleBooking, getAvailability } from '../api.js';
import dayjs from 'dayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

function partitionBookings(items) {
  const now = Date.now();
  const upcoming = [];
  const past = [];
  for (const b of items) {
    const end = new Date(b.end || b.endTime || b.end_at || b.endDate || b.start).getTime();
    if (end >= now) upcoming.push(b); else past.push(b);
  }
  upcoming.sort((a, b) => new Date(a.start) - new Date(b.start));
  past.sort((a, b) => new Date(b.start) - new Date(a.start));
  return { upcoming, past };
}

export default function MyBookings() {
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [dlg, setDlg] = useState({ open: false, booking: null, date: dayjs(), slots: [] });

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const { data } = await api.get('/bookings?client=1');
        if (!ignore) setItems(data.bookings || []);
      } catch (e) {
        if (!ignore) setError(e.response?.data?.error || 'Failed to load bookings');
      }
    })();
    return () => { ignore = true; };
  }, []);

  const { upcoming, past } = useMemo(() => partitionBookings(items), [items]);

  async function openReschedule(b) {
    const d = dayjs(b.start);
    const dateStr = d.format('YYYY-MM-DD');
    const serviceId = b.serviceId?._id || b.serviceId;
    const proId = b.professionalUserId || undefined;
    const slots = await getAvailability(dateStr, serviceId, proId);
    setDlg({ open: true, booking: b, date: d, slots });
  }

  async function refreshList() {
    try {
      const { data } = await api.get('/bookings?client=1');
      setItems(data.bookings || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load bookings');
    }
  }

  async function onDateChange(v) {
    const d = v || dayjs();
    const dateStr = d.format('YYYY-MM-DD');
    const b = dlg.booking;
    const serviceId = b.serviceId?._id || b.serviceId;
    const proId = b.professionalUserId || undefined;
    const slots = await getAvailability(dateStr, serviceId, proId);
    setDlg(prev => ({ ...prev, date: d, slots }));
  }

  async function chooseSlot(iso) {
    try {
      await rescheduleBooking(dlg.booking._id, iso);
      setDlg({ open: false, booking: null, date: dayjs(), slots: [] });
      setSnack({ open: true, msg: 'Booking rescheduled', severity: 'success' });
      await refreshList();
    } catch (e) {
      setSnack({ open: true, msg: e.response?.data?.error || 'Failed to reschedule', severity: 'error' });
    }
  }

  const TimeGrid = ({ slots }) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {slots.map(s => (
        <Button key={s} variant="outlined" onClick={() => chooseSlot(s)}>
          {dayjs(s).format('h:mm A')}
        </Button>
      ))}
      {slots.length === 0 && <Typography color="text.secondary">No available times for this day.</Typography>}
    </Box>
  );

  const renderList = (list) => (
    <List>
      {list.map(b => (
        <ListItem key={b._id} divider secondaryAction={
          new Date(b.end).getTime() >= Date.now() && (
            <Button size="small" onClick={() => openReschedule(b)}>Reschedule</Button>
          )
        }>
          <ListItemText
            primary={`${new Date(b.start).toLocaleString()} — ${(b.serviceId && b.serviceId.name) || b.serviceName || 'Service'}`}
            secondary={b.status ? `Status: ${b.status}` : ''}
          />
          {b.professional && (
            <Chip label={b.professional.name || b.professional.email} size="small" />
          )}
        </ListItem>
      ))}
    </List>
  );

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>My Bookings</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Upcoming (${upcoming.length})`} />
        <Tab label={`Past (${past.length})`} />
      </Tabs>

      <Box hidden={tab !== 0}>{renderList(upcoming)}</Box>
      <Box hidden={tab !== 1}>{renderList(past)}</Box>

      <Dialog open={dlg.open} onClose={() => setDlg(d => ({ ...d, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Reschedule booking</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={dlg.date}
              onChange={onDateChange}
              disablePast
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
          <Box sx={{ mt: 2 }}>
            <TimeGrid slots={dlg.slots} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlg(d => ({ ...d, open: false }))}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Container>
  );
}
