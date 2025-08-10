import React, { useEffect, useMemo, useState } from 'react';
import { Box, Container, Typography, TextField, MenuItem, Button, Stack, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { listBookingsAdmin, cancelBooking, assignBooking, getAvailability, rescheduleBooking, restoreBooking } from '../api';

export default function Admin() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [dlg, setDlg] = useState({ open: false, booking: null, date: dayjs(), slots: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        q: q || undefined,
        status: status || undefined,
        dateFrom: from ? from.format('YYYY-MM-DD') : undefined,
        dateTo: to ? to.format('YYYY-MM-DD') : undefined,
        page: page + 1,
        limit: pageSize,
      };
      const data = await listBookingsAdmin(params);
      const items = data.items.map(d => ({
        id: d._id,
        serviceName: d.serviceId?.name || '',
        serviceId: d.serviceId?._id || d.serviceId,
        clientName: d.clientName,
        clientEmail: d.clientEmail,
        clientPhone: d.clientPhone || '',
        start: d.start,
        end: d.end,
        status: d.status,
        professionalUserId: d.professionalUserId || '',
      }));
      setRows(items);
      setRowCount(data.total);
    } catch (e) {
      setSnack({ open: true, msg: e.response?.data?.error || 'Failed to load', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [page, pageSize]);
  const handleSearch = () => { setPage(0); fetchData(); };

  const [assignEmail, setAssignEmail] = useState('');

  async function openReschedule(row) {
    try {
      const d = dayjs(row.start);
      const dateStr = d.format('YYYY-MM-DD');
      const slots = await getAvailability(dateStr, row.serviceId, row.professionalUserId || undefined);
      setDlg({ open: true, booking: row, date: d, slots });
    } catch (e) {
      setSnack({ open: true, msg: e.response?.data?.error || 'Failed to load availability', severity: 'error' });
    }
  }

  async function onDlgDateChange(v) {
    const d = v || dayjs();
    const dateStr = d.format('YYYY-MM-DD');
    try {
      const slots = await getAvailability(dateStr, dlg.booking.serviceId, dlg.booking.professionalUserId || undefined);
      setDlg(prev => ({ ...prev, date: d, slots }));
    } catch (e) {
      setSnack({ open: true, msg: e.response?.data?.error || 'Failed to load availability', severity: 'error' });
    }
  }

  async function chooseSlot(iso) {
    try {
      await rescheduleBooking(dlg.booking.id, iso);
      setDlg({ open: false, booking: null, date: dayjs(), slots: [] });
      setSnack({ open: true, msg: 'Booking rescheduled', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnack({ open: true, msg: e.response?.data?.error || 'Failed to reschedule', severity: 'error' });
    }
  }

  const TimeGrid = ({ slots }) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
      {slots.map(s => (
        <Button key={s} variant="outlined" onClick={() => chooseSlot(s)}>
          {dayjs(s).format('h:mm A')}
        </Button>
      ))}
      {slots.length === 0 && <Typography color="text.secondary">No available times for this day.</Typography>}
    </Box>
  );

  const columns = useMemo(() => ([
    { field: 'start', headerName: 'Start', flex: 1, valueFormatter: v => dayjs(v.value).format('YYYY-MM-DD HH:mm') },
    { field: 'end', headerName: 'End', flex: 1, valueFormatter: v => dayjs(v.value).format('YYYY-MM-DD HH:mm') },
    { field: 'serviceName', headerName: 'Service', flex: 1 },
    { field: 'clientName', headerName: 'Client', flex: 1 },
    { field: 'clientEmail', headerName: 'Email', flex: 1 },
    { field: 'clientPhone', headerName: 'Phone', flex: 1 },
    { field: 'status', headerName: 'Status', width: 120 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 360,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            disabled={params.row.status !== 'booked'}
            onClick={async () => {
              try {
                await cancelBooking(params.id);
                setSnack({ open: true, msg: 'Booking cancelled', severity: 'success' });
                fetchData();
              } catch (e) {
                setSnack({ open: true, msg: e.response?.data?.error || 'Cancel failed', severity: 'error' });
              }
            }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={params.row.status !== 'cancelled'}
            onClick={async () => {
              try {
                await restoreBooking(params.id);
                setSnack({ open: true, msg: 'Booking restored', severity: 'success' });
                fetchData();
              } catch (e) {
                setSnack({ open: true, msg: e.response?.data?.error || 'Restore failed', severity: 'error' });
              }
            }}
          >
            Restore
          </Button>
          <TextField
            size="small"
            placeholder="pro email"
            value={assignEmail}
            onChange={(e) => setAssignEmail(e.target.value)}
          />
          <Button
            size="small"
            variant="contained"
            onClick={async () => {
              try {
                await assignBooking(params.id, { professionalEmail: assignEmail });
                setSnack({ open: true, msg: 'Assigned to professional', severity: 'success' });
                fetchData();
              } catch (e) {
                setSnack({ open: true, msg: e.response?.data?.error || 'Assign failed', severity: 'error' });
              }
            }}
          >
            Assign
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => openReschedule(params.row)}
          >
            Reschedule
          </Button>
        </Stack>
      )
    },
  ]), []);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Admin — Bookings</Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Search name/email/phone" value={q} onChange={e => setQ(e.target.value)} fullWidth />
          <TextField select label="Status" value={status} onChange={e => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="booked">Booked</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
          <DatePicker label="From" value={from} onChange={setFrom} />
          <DatePicker label="To" value={to} onChange={setTo} />
          <Button variant="contained" onClick={handleSearch}>Search</Button>
        </Stack>
      </LocalizationProvider>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pagination
          paginationMode="server"
          rowCount={rowCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          rowsPerPageOptions={[10, 25, 50, 100]}
          loading={loading}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dlg.open} onClose={() => setDlg(d => ({ ...d, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Reschedule booking</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={dlg.date}
              onChange={onDlgDateChange}
              disablePast
            />
          </LocalizationProvider>
          <TimeGrid slots={dlg.slots} />
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
