import { Box, Card, keyframes } from "@mui/material";
import { styled } from "@mui/material/styles";

export const glowAnimation = keyframes`
  0% { box-shadow: 0 0 10px #90caf9; }
  50% { box-shadow: 0 0 20px #90caf9; }
  100% { box-shadow: 0 0 10px #90caf9; }
`;

export const GlowingBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: "16px",
  background: "rgba(25, 118, 210, 0.05)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(144, 202, 249, 0.2)",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-5px)",
    animation: `${glowAnimation} 2s infinite`,
    background: "rgba(25, 118, 210, 0.1)",
  },
}));

export const GlowingCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: "16px",
  background: "rgba(25, 118, 210, 0.05)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(144, 202, 249, 0.2)",
}));

export const BlueAccent = styled(Box)(() => ({
  position: "absolute",
  width: "300px",
  height: "300px",
  background:
    "radial-gradient(circle, rgba(25, 118, 210, 0.2) 0%, transparent 70%)",
  filter: "blur(40px)",
  zIndex: 0,
}));

export const PageContainer = styled(Box)({
  minHeight: "100vh",
  background: "#0A1929",
  position: "relative",
  overflow: "hidden",
});
