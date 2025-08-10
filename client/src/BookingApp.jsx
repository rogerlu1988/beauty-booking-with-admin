import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Button, Grid, Card, CardContent, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, Chip
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { getServices, getAvailability, createBooking, getProfessionals } from './api.js';

function Hero() {
  return (
    <Box sx={{ py: 10, mb: 4, textAlign: 'center', background: 'radial-gradient(80% 120% at 50% 0%, #f3e8ff 0%, #ffffff 70%)' }}>
      <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>GlowUp Studio</Typography>
      <Typography variant="h2" sx={{ mt: 1 }}>Book beauty that fits your day</Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mt: 2, maxWidth: 720, mx: 'auto' }}>
        Seamless appointments for facials, massages, hair, and more. Pick a service, choose a time, and you’re set.
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Chip label="Same-day slots" color="primary" sx={{ mr: 1 }} />
        <Chip label="Secure booking" color="secondary" variant="outlined" />
      </Box>
    </Box>
  );
}

function ServiceCard({ service, onSelect }) {
  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6">{service.name}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>{service.description}</Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Chip label={`${service.durationMinutes} min`} />
          <Chip label={`$${service.price.toFixed(2)}`} color="secondary" />
        </Box>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button fullWidth variant="contained" onClick={() => onSelect(service)}>Select</Button>
      </CardActions>
    </Card>
  );
}

function TimeGrid({ slots, onPick }) {
  if (!slots.length) return <Typography color="text.secondary">No available times for this day.</Typography>;
  return (
    <Grid container spacing={1}>
      {slots.map(s => {
        const t = dayjs(s);
        return (
          <Grid item key={s}>
            <Button variant="outlined" onClick={() => onPick(s)}>{t.format('h:mm A')}</Button>
          </Grid>
        );
      })}
    </Grid>
  );
}

export default function BookingApp() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [date, setDate] = useState(dayjs());
  const [slots, setSlots] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [pros, setPros] = useState([]);
  const [selectedProId, setSelectedProId] = useState(''); // controls both grid filter and default selection in dialog
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  useEffect(() => {
    (async () => {
      const s = await getServices();
      setServices(s);
      if (s.length) setSelectedService(s[0]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedService) return;
      const day = date.format('YYYY-MM-DD');
      const avail = await getAvailability(day, selectedService._id, selectedProId || undefined);
      setSlots(avail);
    })();
  }, [date, selectedService, selectedProId]);

  // Load professionals when the selected service changes; reset pro filter to Any
  useEffect(() => {
    (async () => {
      if (!selectedService) return;
      const list = await getProfessionals({ serviceId: selectedService._id });
      setPros(list);
      setSelectedProId('');
    })();
  }, [selectedService]);

  const handlePickSlot = (iso) => {
    setOpenForm(true);
    setForm(f => ({ ...f, start: iso }));
    // keep current selectedProId (grid filter) as default selection in dialog
  };

  const handleCreate = async () => {
    if (!form.name || !form.email) {
      setSnack({ open: true, msg: 'Name and email are required', severity: 'error' });
      return;
    }
    try {
      await createBooking({
        serviceId: selectedService._id,
        clientName: form.name,
        clientEmail: form.email,
        clientPhone: form.phone,
        notes: form.notes,
        start: form.start,
        professionalUserId: selectedProId || undefined,
      });
      setOpenForm(false);
      setSnack({ open: true, msg: 'Booking confirmed! Check your email for details.', severity: 'success' });
      const day = date.format('YYYY-MM-DD');
      const avail = await getAvailability(day, selectedService._id);
      setSlots(avail);
    } catch (e) {
      setSnack({ open: true, msg: e.response?.data?.error || 'Failed to book', severity: 'error' });
    }
  };

  return (
    <>
      <Hero />

      <Container sx={{ pb: 8 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h5" sx={{ mb: 2 }}>1) Choose a service</Typography>
            <Grid container spacing={2}>
              {services.map(s => (
                <Grid item key={s._id} xs={12} sm={6}>
                  <ServiceCard service={s} onSelect={setSelectedService} />
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h5" sx={{ mb: 2 }}>2) Pick a date & time</Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={date}
                onChange={(v) => setDate(v || dayjs())}
                disablePast
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
            <TextField
              select fullWidth margin="dense" label="Professional (optional)"
              value={selectedProId}
              onChange={(e) => setSelectedProId(e.target.value)}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 2 }}
            >
              <option value="">-- Any professional --</option>
              {pros.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name || p.email}
                </option>
              ))}
            </TextField>
            <Box sx={{ mt: 2 }}>
              <TimeGrid slots={slots} onPick={handlePickSlot} />
            </Box>
          </Grid>
        </Grid>
      </Container>

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enter your details</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus fullWidth margin="dense" label="Full name"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <TextField
            fullWidth margin="dense" label="Email"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
          <TextField
            fullWidth margin="dense" label="Phone (optional)"
            value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
          <TextField
            fullWidth margin="dense" label="Notes (optional)" multiline minRows={2}
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <TextField
            select fullWidth margin="dense" label="Professional (optional)"
            value={selectedProId}
            onChange={(e) => setSelectedProId(e.target.value)}
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
            helperText="This defaults to your selection above."
          >
            <option value="">-- Any professional --</option>
            {pros.map(p => (
              <option key={p._id} value={p._id}>
                {p.name || p.email}
              </option>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Confirm booking</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </>
  );
}
