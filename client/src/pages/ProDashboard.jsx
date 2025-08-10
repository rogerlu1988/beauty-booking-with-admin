import React, { useEffect, useState } from 'react';
import { Container, Typography, List, ListItem, ListItemText, Alert } from '@mui/material';
import { api } from '../api';

export default function ProDashboard() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        // Placeholder endpoint; replace with real professional bookings API when available
        const { data } = await api.get('/bookings?mine=1');
        if (!ignore) setBookings(data.bookings || []);
      } catch (e) {
        if (!ignore) setError(e.response?.data?.error || 'Failed to load bookings');
      }
    })();
    return () => { ignore = true; };
  }, []);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Professional Dashboard</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {bookings.length === 0 ? (
        <Typography color="text.secondary">No bookings yet.</Typography>
      ) : (
        <List>
          {bookings.map(b => (
            <ListItem key={b._id} divider>
              <ListItemText
                primary={`${new Date(b.startTime).toLocaleString()} — ${b.serviceName || 'Service'}`}
                secondary={`Client: ${b.clientName || b.clientEmail || 'N/A'}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
}
