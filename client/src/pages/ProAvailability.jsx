import React, { useEffect, useState } from 'react';
import { Container, Typography, Stack, TextField, Button, Snackbar, Alert } from '@mui/material';
import { getProProfile, updateProProfile } from '../api.js';

export default function ProAvailability() {
  const [open, setOpen] = useState('09:00');
  const [close, setClose] = useState('18:00');
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  useEffect(() => {
    (async () => {
      try {
        const prof = await getProProfile();
        if (prof?.businessHours) {
          setOpen(prof.businessHours.open || '09:00');
          setClose(prof.businessHours.close || '18:00');
        }
      } catch (e) {
        setSnack({ open: true, msg: e.response?.data?.error || 'Failed to load', severity: 'error' });
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      await updateProProfile({ businessHours: { open, close } });
      setSnack({ open: true, msg: 'Availability updated', severity: 'success' });
    } catch (e) {
      setSnack({ open: true, msg: e.response?.data?.error || 'Failed to update', severity: 'error' });
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>My Availability</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <TextField
          label="Open"
          type="time"
          value={open}
          onChange={(e) => setOpen(e.target.value)}
          inputProps={{ step: 300 }}
        />
        <TextField
          label="Close"
          type="time"
          value={close}
          onChange={(e) => setClose(e.target.value)}
          inputProps={{ step: 300 }}
        />
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </Stack>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Container>
  );
}
