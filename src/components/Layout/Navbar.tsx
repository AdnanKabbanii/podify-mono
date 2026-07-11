import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.js";

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const StyledAppBar = styled(AppBar)({
  background: "rgba(18, 18, 18, 0.8)",
  backdropFilter: "blur(10px)",
  borderBottom: "1px solid rgba(144, 202, 249, 0.2)",
  boxShadow: "none",
  animation: `${fadeIn} 0.5s ease-out`,
});

const StyledLink = styled(RouterLink)({
  textDecoration: "none",
  color: "inherit",
});

const NavButton = styled(Button)({
  borderRadius: "8px",
  padding: "8px 16px",
  color: "#fff",
  transition: "all 0.3s ease",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "linear-gradient(45deg, #90CAF9 30%, #64B5F6 90%)",
    opacity: 0,
    transition: "opacity 0.3s ease",
    zIndex: -1,
  },
  "&:hover": {
    color: "#fff",
    "&::before": {
      opacity: 1,
    },
  },
});

const LogoText = styled(Typography)({
  background: "linear-gradient(45deg, #90CAF9 30%, #64B5F6 90%)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  fontWeight: 700,
  letterSpacing: "1px",
});

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <StyledAppBar position="fixed">
      <Container maxWidth="lg">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={4}
          sx={{ height: 70 }}
        >
          <StyledLink to="/">
            <LogoText variant="h5">VeilCast</LogoText>
          </StyledLink>

          <Box sx={{ display: "flex", gap: 2 }}>
            <StyledLink to="/">
              <NavButton>Home</NavButton>
            </StyledLink>
            <StyledLink to="/dashboard">
              <NavButton>Dashboard</NavButton>
            </StyledLink>

            {isAuthenticated ? (
              <NavButton
                onClick={handleLogout}
                sx={{
                  border: "1px solid rgba(144, 202, 249, 0.5)",
                  "&:hover": {
                    border: "1px solid rgba(144, 202, 249, 0)",
                  },
                }}
              >
                Logout
              </NavButton>
            ) : (
              <>
                <StyledLink to="/signin">
                  <NavButton>Sign In</NavButton>
                </StyledLink>
                <StyledLink to="/signup">
                  <NavButton
                    sx={{
                      border: "1px solid rgba(144, 202, 249, 0.5)",
                      "&:hover": {
                        border: "1px solid rgba(144, 202, 249, 0)",
                      },
                    }}
                  >
                    Sign Up
                  </NavButton>
                </StyledLink>
              </>
            )}
          </Box>
        </Stack>
      </Container>
    </StyledAppBar>
  );
}
