import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Button, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import BookingApp from './BookingApp';
import Admin from './pages/Admin';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <AppBar position="sticky" color="transparent" elevation={0}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Button component={Link} to="/" sx={{ textTransform: 'none' }}>
              <Typography variant="h6" color="primary">GlowUp</Typography>
            </Button>
            <span>
              <Button component={Link} to="/admin" sx={{ mr: 1 }}>Admin</Button>
              <Button href="mailto:hello@example.com">Contact</Button>
            </span>
          </Toolbar>
        </AppBar>
        <Routes>
          <Route path="/" element={<BookingApp />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
