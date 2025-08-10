import React, { useEffect, useMemo, useState } from 'react';
import { Box, Container, Typography, TextField, Button, Stack, Chip, Autocomplete, Snackbar, Alert } from '@mui/material';
import { getServices, getProProfile, updateProProfile } from '../api.js';

export default function ProServices() {
  const [allServices, setAllServices] = useState([]);
  const [selected, setSelected] = useState([]);
  const [open, setOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  useEffect(() => {
    (async () => {
      const [svc, prof] = await Promise.all([
        getServices(),
        getProProfile(),
      ]);
      setAllServices(svc);
      const selectedIds = new Set((prof.services || []).map(String));
      setSelected(svc.filter(s => selectedIds.has(String(s._id))));
      setOpen(true);
    })();
  }, []);

  const handleSave = async () => {
    try {
      await updateProProfile({ services: selected.map(s => s._id) });
      setSnack({ open: true, msg: 'Services updated', severity: 'success' });
    } catch (e) {
      setSnack({ open: true, msg: e.response?.data?.error || 'Failed to update', severity: 'error' });
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>My Services</Typography>
      {open && (
        <>
          <Autocomplete
            multiple
            options={allServices}
            getOptionLabel={(o) => o.name}
            value={selected}
            onChange={(_e, val) => setSelected(val)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip variant="outlined" label={option.name} {...getTagProps({ index })} key={option._id} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} variant="outlined" label="Select services you provide" placeholder="Services" />
            )}
          />
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleSave}>Save</Button>
          </Stack>
        </>
      )}

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Container>
  );
}
