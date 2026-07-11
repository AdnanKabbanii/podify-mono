import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import CustomerServiceChat from "./components/CustomerServiceChat.tsx";
import Navbar from "./components/Layout/Navbar.tsx";
import PodcastGeneration from "./components/PodcastGeneration.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { AgentProvider } from "./contexts/AgentContext.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import PodcastPlayer from "./pages/PodcastPlayer.tsx";
import SignIn from "./pages/SignIn.tsx";
import SignUp from "./pages/SignUp.tsx";

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
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#121212",
          minHeight: "100vh",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});

function NavbarWrapper() {
  const location = useLocation();
  const hideNavbarPaths = ["/signin", "/signup"];

  return hideNavbarPaths.includes(location.pathname) ? null : <Navbar />;
}

// CustomerServiceChatWrapper component to conditionally render the chat
function CustomerServiceChatWrapper() {
  const location = useLocation();
  const hideChatPaths = ["/signin", "/signup"];

  return hideChatPaths.includes(location.pathname) ? null : <CustomerServiceChat />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "background.default",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BrowserRouter>
          <AuthProvider>
            <AgentProvider>
              <NavbarWrapper />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/podcast/:transcriptId"
                  element={
                    <ProtectedRoute>
                      <PodcastPlayer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/podcast/generate/:id"
                  element={
                    <ProtectedRoute>
                      <PodcastGeneration />
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <CustomerServiceChatWrapper />
            </AgentProvider>
          </AuthProvider>
        </BrowserRouter>
      </Box>
    </ThemeProvider>
  );
}

export default App;
