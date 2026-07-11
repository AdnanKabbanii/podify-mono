import { ArrowBack, LockOutlined } from "@mui/icons-material";
import {
    Alert,
    Avatar,
    Box,
    Button,
    CssBaseline,
    Grid,
    Link,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import * as React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import AppTheme from "../shared-theme/AppTheme.js";
import {
    BlueAccent,
    GlowingCard,
    PageContainer,
} from "../styles/commonStyles.js";

const FormContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  maxWidth: "450px",
  margin: "0 auto",
  padding: theme.spacing(4),
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  position: "relative",
  zIndex: 1,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    maxWidth: "100%"
  }
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  margin: theme.spacing(1),
  backgroundColor: theme.palette.primary.main,
  boxShadow: "0 0 20px rgba(144, 202, 249, 0.4)",
  width: 56,
  height: 56,
  [theme.breakpoints.down('sm')]: {
    width: 48,
    height: 48
  }
}));

const GlowingTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    backgroundColor: "rgba(25, 118, 210, 0.05)",
    backdropFilter: "blur(10px)",
    borderRadius: "8px",
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(144, 202, 249, 0.5)",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
      boxShadow: "0 0 10px rgba(144, 202, 249, 0.3)",
    },
  },
  "& .MuiFormLabel-asterisk": {
    display: "none"
  }
}));

export default function SignUp() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formErrors, setFormErrors] = React.useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
  });
  const [formErrorMessages, setFormErrorMessages] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const validateForm = () => {
    const firstName = document.getElementById("firstName") as HTMLInputElement;
    const lastName = document.getElementById("lastName") as HTMLInputElement;
    const email = document.getElementById("email") as HTMLInputElement;
    const password = document.getElementById("password") as HTMLInputElement;

    const newErrors = {
      firstName: false,
      lastName: false,
      email: false,
      password: false,
    };

    const newErrorMessages = {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    };

    let isValid = true;

    if (!firstName.value.trim()) {
      newErrors.firstName = true;
      newErrorMessages.firstName = "First name is required";
      isValid = false;
    }

    if (!lastName.value.trim()) {
      newErrors.lastName = true;
      newErrorMessages.lastName = "Last name is required";
      isValid = false;
    }

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      newErrors.email = true;
      newErrorMessages.email = "Please enter a valid email address";
      isValid = false;
    }

    if (!password.value || password.value.length < 6) {
      newErrors.password = true;
      newErrorMessages.password = "Password must be at least 6 characters long";
      isValid = false;
    }

    setFormErrors(newErrors);
    setFormErrorMessages(newErrorMessages);
    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    const data = new FormData(event.currentTarget);
    const email = data.get("email") as string;
    const password = data.get("password") as string;
    const firstName = data.get("firstName") as string;
    const lastName = data.get("lastName") as string;

    try {
      setError("");
      setLoading(true);
      await signup(email, password, firstName, lastName);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppTheme>
      <CssBaseline enableColorScheme />
      <PageContainer>
        <BlueAccent 
          sx={(theme) => ({ 
            top: "5%", 
            right: "15%",
            [theme.breakpoints.down('sm')]: {
              display: 'none'
            }
          })} 
        />
        <BlueAccent 
          sx={(theme) => ({ 
            bottom: "15%", 
            left: "10%",
            [theme.breakpoints.down('sm')]: {
              display: 'none'
            }
          })} 
        />

        <Button
          onClick={() => navigate("/")}
          startIcon={<ArrowBack />}
          sx={{
            position: "fixed",
            top: { xs: 8, sm: 16 },
            left: { xs: 8, sm: 16 },
            color: "text.secondary",
            zIndex: 2,
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Return to Home
        </Button>

        <FormContainer>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              px: { xs: 2, sm: 0 }
            }}
          >
            <StyledAvatar>
              <LockOutlined />
            </StyledAvatar>
            <Typography
              component="h1"
              variant="h4"
              sx={{
                mb: 3,
                background: "linear-gradient(45deg, #90CAF9 30%, #64B5F6 90%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
                textAlign: 'center'
              }}
            >
              Sign Up
            </Typography>

            <GlowingCard sx={{ 
              width: "100%", 
              p: { xs: 2, sm: 3, md: 4 }, 
              mb: 2,
              borderRadius: { xs: 2, sm: 3 }
            }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={3}>
                  <Grid 
                    container 
                    spacing={{ xs: 1, sm: 2 }} 
                    sx={{ 
                      width: '100%',
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      gap: 0,
                      '& .MuiGrid-item': {
                        pl: '0 !important',
                        pr: { sm: '8px' },
                        width: { xs: '100%', sm: 'auto' },
                        '&:last-child': {
                          pr: '0'
                        }
                      }
                    }}
                  >
                    <Grid item xs={12} sm={6}>
                      <GlowingTextField
                        autoComplete="given-name"
                        name="firstName"
                        required
                        fullWidth
                        id="firstName"
                        label="First Name"
                        autoFocus
                        error={formErrors.firstName}
                        helperText={formErrorMessages.firstName}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <GlowingTextField
                        required
                        fullWidth
                        id="lastName"
                        label="Last Name"
                        name="lastName"
                        autoComplete="family-name"
                        error={formErrors.lastName}
                        helperText={formErrorMessages.lastName}
                      />
                    </Grid>
                  </Grid>
                  <GlowingTextField
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    error={formErrors.email}
                    helperText={formErrorMessages.email}
                  />
                  <GlowingTextField
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    error={formErrors.password}
                    helperText={formErrorMessages.password}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      borderRadius: "8px",
                      background:
                        "linear-gradient(45deg, #1976D2 30%, #2196F3 90%)",
                      boxShadow: "0 0 20px rgba(33, 150, 243, 0.3)",
                      "&:hover": {
                        boxShadow: "0 0 25px rgba(33, 150, 243, 0.5)",
                      },
                    }}
                  >
                    {loading ? "Signing up..." : "Sign Up"}
                  </Button>
                  <Grid container justifyContent="center">
                    <Grid item>
                      <Link
                        component={RouterLink}
                        to="/signin"
                        sx={{
                          color: "primary.main",
                          textDecoration: "none",
                          mt: 1,
                          display: "inline-block",
                          textAlign: "center",
                          "&:hover": {
                            textDecoration: "underline",
                          },
                        }}
                      >
                        Already have an account? Sign in
                      </Link>
                    </Grid>
                  </Grid>
                </Stack>
              </Box>
            </GlowingCard>
          </Box>
        </FormContainer>
      </PageContainer>
    </AppTheme>
  );
}
