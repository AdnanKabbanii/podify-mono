import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ReactNode } from "react";

interface AppThemeProps {
  children: ReactNode;
  disableCustomTheme?: boolean;
}

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#90caf9",
    },
    secondary: {
      main: "#f48fb1",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default function AppTheme({
  children,
  disableCustomTheme,
}: AppThemeProps) {
  return (
    <ThemeProvider theme={disableCustomTheme ? createTheme() : theme}>
      {children}
    </ThemeProvider>
  );
}
