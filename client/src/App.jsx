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

function AuthButtons() {
  const { user, setToken } = useAuth();
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem('token'); setToken(''); navigate('/'); };
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {user ? (
        <>
          <Typography variant="body2" color="text.secondary">{user.role}</Typography>
          <Button onClick={logout}>Logout</Button>
        </>
      ) : (
        <>
          <Button component={Link} to="/login">Login</Button>
          <Button component={Link} to="/register">Register</Button>
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
        <Button component={Link} to="/admin" sx={{ mr: 1 }}>Admin</Button>
      )}
      {user?.role === 'professional' && (
        <Button component={Link} to="/pro" sx={{ mr: 1 }}>Pro</Button>
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
            <Toolbar sx={{ justifyContent: 'space-between' }}>
              <Button component={Link} to="/" sx={{ textTransform: 'none' }}>
                <Typography variant="h6" color="primary">GlowUp</Typography>
              </Button>
              <Stack direction="row" spacing={1} alignItems="center">
                <NavLinks />
                <Button href="mailto:hello@example.com">Contact</Button>
                <AuthButtons />
              </Stack>
            </Toolbar>
          </AppBar>
          <Routes>
            <Route path="/" element={<BookingApp />} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><Admin /></ProtectedRoute>} />
            <Route path="/pro" element={<ProtectedRoute roles={["professional"]}><ProDashboard /></ProtectedRoute>} />
            <Route path="/login" element={<Login onSuccess={() => window.location.assign('/')} />} />
            <Route path="/register" element={<Register onSuccess={() => window.location.assign('/')} />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
