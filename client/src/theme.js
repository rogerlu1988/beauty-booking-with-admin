import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#6a5acd' }, // slate blue
    secondary: { main: '#ff6f61' } // coral
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 9999 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 24 } } }
  },
  typography: {
    fontFamily: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h2: { fontWeight: 800 }
  }
});

export default theme;
