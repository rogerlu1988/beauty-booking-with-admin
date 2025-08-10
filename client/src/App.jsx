import React from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Button, Typography, Stack } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import BookingApp from './BookingApp';
import Admin from './pages/Admin';
import { AuthProvider, useAuth } from './auth';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import ProDashboard from './pages/ProDashboard';
import ProServices from './pages/ProServices';
import ProAvailability from './pages/ProAvailability';
import MyBookings from './pages/MyBookings';

function AuthButtons() {
  const { user, setToken } = useAuth();
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem('token'); setToken(''); navigate('/'); };
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" rowGap={1}>
      {user ? (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{user.role}</Typography>
          <Button onClick={logout} sx={{ whiteSpace: 'nowrap' }}>Logout</Button>
        </>
      ) : (
        <>
          <Button component={Link} to="/login" sx={{ whiteSpace: 'nowrap' }}>Login</Button>
          <Button component={Link} to="/register" sx={{ whiteSpace: 'nowrap' }}>Register</Button>
        </>
      )}
    </Stack>
  );
}

function NavLinks() {
  const { user } = useAuth();
  return (
    <>
      {user?.role === 'admin' && (
        <Button component={Link} to="/admin" sx={{ mr: 1.5, whiteSpace: 'nowrap' }}>Admin</Button>
      )}
      {user?.role === 'client' && (
        <Button component={Link} to="/me/bookings" sx={{ mr: 1.5, whiteSpace: 'nowrap' }}>My bookings</Button>
      )}
      {user?.role === 'professional' && (
        <>
          <Button component={Link} to="/pro" sx={{ mr: 1.5, whiteSpace: 'nowrap' }}>Pro</Button>
          <Button component={Link} to="/pro/services" sx={{ mr: 1.5, whiteSpace: 'nowrap' }}>
            My services
          </Button>
          <Button component={Link} to="/pro/availability" sx={{ mr: 1.5, whiteSpace: 'nowrap' }}>
            My availability
          </Button>
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <AppBar position="sticky" color="transparent" elevation={0}>
            <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 1, rowGap: 1 }}>
              <Button component={Link} to="/" sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                <Typography variant="h6" color="primary">GlowUp</Typography>
              </Button>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" rowGap={1}>
                <NavLinks />
                <Button href="mailto:hello@example.com" sx={{ whiteSpace: 'nowrap' }}>Contact</Button>
                <AuthButtons />
              </Stack>
            </Toolbar>
          </AppBar>
          <Routes>
            <Route path="/" element={<BookingApp />} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><Admin /></ProtectedRoute>} />
            <Route path="/me/bookings" element={<ProtectedRoute roles={["client"]}><MyBookings /></ProtectedRoute>} />
            <Route path="/pro" element={<ProtectedRoute roles={["professional"]}><ProDashboard /></ProtectedRoute>} />
            <Route path="/pro/services" element={<ProtectedRoute roles={["professional"]}><ProServices /></ProtectedRoute>} />
            <Route path="/pro/availability" element={<ProtectedRoute roles={["professional"]}><ProAvailability /></ProtectedRoute>} />
            <Route path="/login" element={<Login onSuccess={({ user }) => {
              const role = user?.role;
              const dest = role === 'admin' ? '/admin' : role === 'professional' ? '/pro' : '/me/bookings';
              window.location.assign(dest);
            }} />} />
            <Route path="/register" element={<Register onSuccess={({ user }) => {
              const role = user?.role;
              const dest = role === 'admin' ? '/admin' : role === 'professional' ? '/pro' : '/me/bookings';
              window.location.assign(dest);
            }} />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
