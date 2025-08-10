import React, { useState } from 'react';
import { Container, TextField, Button, Stack, Typography, Alert, MenuItem } from '@mui/material';
import { registerUser } from '../api';

export default function Register({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await registerUser({ email, password, role, name, phone });
      localStorage.setItem('token', token);
      if (onSuccess) onSuccess({ token, user });
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container sx={{ py: 6, maxWidth: 520 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Create account</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <TextField select label="Role" value={role} onChange={e => setRole(e.target.value)}>
            <MenuItem value="client">Client</MenuItem>
            <MenuItem value="professional">Service professional</MenuItem>
          </TextField>
          <TextField label="Name" value={name} onChange={e => setName(e.target.value)} />
          <TextField label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
          <Button type="submit" variant="contained" disabled={loading}>Register</Button>
        </Stack>
      </form>
    </Container>
  );
}
