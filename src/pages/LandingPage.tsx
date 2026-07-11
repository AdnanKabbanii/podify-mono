import {
    AutoStories,
    Groups,
    MusicNote,
    Podcasts,
    Security,
} from "@mui/icons-material";
import {
    Box,
    Button,
    Card,
    Container,
    Grid,
    keyframes,
    Stack,
    Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const glowAnimation = keyframes`
  0% { box-shadow: 0 0 10px #90caf9; }
  50% { box-shadow: 0 0 20px #90caf9; }
  100% { box-shadow: 0 0 10px #90caf9; }
`;

const cursorBlink = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
`;

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const TypewriterContainer = styled(Box)({
  minHeight: "80px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(25, 118, 210, 0.05)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  border: "1px solid rgba(144, 202, 249, 0.2)",
  padding: "12px",
  margin: "8px 0",
  animation: `${fadeInUp} 1s ease-out`,
});

const Cursor = styled("span")({
  display: "inline-block",
  width: "3px",
  height: "1em",
  background: "#90CAF9",
  marginLeft: "4px",
  animation: `${cursorBlink} 1s infinite`,
});

const SpeakerText = styled(Typography)({
  fontFamily: "monospace",
  fontSize: "1.1rem",
  color: "#90CAF9",
});

const conversationLines = [
  {
    speaker: "Alex",
    text: "Today we're exploring the fascinating world of AI and its impact on creativity.",
    color: "#FF5252",
  },
  {
    speaker: "Sarah",
    text: "That's right! I've been particularly interested in how AI is transforming content creation.",
    color: "#4CAF50",
  },
  {
    speaker: "Michael",
    text: "And don't forget about the ethical implications we need to consider.",
    color: "#2196F3",
  },
  {
    speaker: "Alex",
    text: "Excellent point! Let's dive deeper into that aspect.",
    color: "#FF5252",
  },
];

const steps = [
  {
    title: "Write Your Story",
    description:
      "Start with any text - blog posts, articles, or stories you want to transform",
    icon: <AutoStories sx={{ fontSize: 48 }} />,
  },
  {
    title: "AI Conversation Creation",
    description:
      "Our AI transforms your content into natural dialogue between multiple speakers",
    icon: <Groups sx={{ fontSize: 48 }} />,
  },
  {
    title: "Voice Generation",
    description:
      "Advanced AI voices bring your conversation to life with natural expressions",
    icon: <MusicNote sx={{ fontSize: 48 }} />,
  },
];

const FeatureBox = styled(Box)(({ theme }) => ({
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

const GradientText = styled(Typography)(() => ({
  background: "linear-gradient(45deg, #90CAF9 30%, #64B5F6 90%)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
}));

const BlueAccent = styled(Box)(() => ({
  position: "absolute",
  width: "300px",
  height: "300px",
  background:
    "radial-gradient(circle, rgba(25, 118, 210, 0.2) 0%, transparent 70%)",
  filter: "blur(40px)",
  zIndex: 0,
}));

export default function LandingPage() {
  const navigate = useNavigate();
  const [displayText, setDisplayText] = useState("");
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerY = canvas.height / 2;
      const amplitude = 30;
      const frequency = 0.02;
      const speed = Date.now() * 0.002;

      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let x = 0; x < canvas.width; x++) {
        const y = centerY + Math.sin(x * frequency + speed) * amplitude;
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = "#90CAF9";
      ctx.lineWidth = 2;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentLine = conversationLines[currentLineIndex];
    const fullText = `${currentLine.speaker}: ${currentLine.text}`;

    if (isTyping) {
      if (displayText.length < fullText.length) {
        timeout = setTimeout(() => {
          setDisplayText(fullText.slice(0, displayText.length + 1));
        }, 50);
      } else {
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 30);
      } else {
        setCurrentLineIndex((prev) => (prev + 1) % conversationLines.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, currentLineIndex, isTyping]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#0A1929",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Blue accent lights */}
      <BlueAccent sx={{ top: "10%", left: "5%" }} />
      <BlueAccent sx={{ bottom: "10%", right: "5%" }} />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        {/* Hero Section */}
        <Grid
          container
          spacing={1}
          sx={{
            minHeight: "50vh",
            alignItems: "center",
            pt: 2,
            mb: -2,
          }}
        >
          <Grid item xs={12} md={7}>
            <Stack spacing={1}>
              <GradientText
                variant="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "2.5rem", md: "3.5rem" },
                  animation: `${fadeInUp} 1s ease-out`,
                  mb: 0.5,
                }}
              >
                Transform Your Text into Engaging Podcasts
              </GradientText>

              <Typography
                variant="h5"
                color="text.secondary"
                sx={{
                  maxWidth: 600,
                  animation: `${fadeInUp} 1s ease-out 0.2s`,
                  animationFillMode: "backwards",
                  mb: 0.5,
                  fontSize: { xs: "1.2rem", md: "1.4rem" },
                }}
              >
                Use AI to convert your transcripts into dynamic conversations
                with multiple voices
              </Typography>

              <Box
                sx={{
                  animation: `${fadeInUp} 1s ease-out 0.4s`,
                  animationFillMode: "backwards",
                  mb: 1,
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate("/dashboard")}
                  sx={{
                    px: 4,
                    py: 1,
                    borderRadius: "12px",
                    background:
                      "linear-gradient(45deg, #1976D2 30%, #2196F3 90%)",
                    boxShadow: "0 0 20px rgba(33, 150, 243, 0.3)",
                    "&:hover": {
                      boxShadow: "0 0 25px rgba(33, 150, 243, 0.5)",
                    },
                  }}
                >
                  Get Started
                </Button>
              </Box>
            </Stack>
          </Grid>

          <Grid
            item
            xs={12}
            md={5}
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <Box
              sx={{
                position: "relative",
                animation: `${fadeInUp} 1s ease-out 0.6s`,
                animationFillMode: "backwards",
              }}
            >
              <canvas
                ref={canvasRef}
                width={400}
                height={140}
                style={{
                  width: "100%",
                  height: "140px",
                  borderRadius: "16px",
                  background: "rgba(25, 118, 210, 0.05)",
                  border: "1px solid rgba(144, 202, 249, 0.2)",
                }}
              />
            </Box>
          </Grid>
        </Grid>

        {/* Typewriter Demo */}
        <Box sx={{ py: 0, mt: -10 }}>
          <TypewriterContainer>
            <Box>
              <SpeakerText
                variant="body1"
                sx={{
                  color: conversationLines[currentLineIndex].color,
                }}
              >
                {displayText}
                <Cursor />
              </SpeakerText>
            </Box>
          </TypewriterContainer>
        </Box>

        {/* How it Works Section */}
        <Box sx={{ pt: 9, pb: 3 }}>
          <GradientText
            variant="h2"
            sx={{
              textAlign: "center",
              mb: 3,
              animation: `${fadeInUp} 1s ease-out`,
              fontSize: { xs: "2rem", md: "2.5rem" },
            }}
          >
            How It Works
          </GradientText>

          <Grid container spacing={3}>
            {steps.map((step, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card
                  sx={{
                    height: "100%",
                    background: "rgba(25, 118, 210, 0.05)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(144, 202, 249, 0.2)",
                    borderRadius: "16px",
                    p: 3,
                    animation: `${fadeInUp} 1s ease-out ${index * 0.2}s`,
                    animationFillMode: "backwards",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-10px)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                    },
                  }}
                >
                  <Stack spacing={2} alignItems="center" textAlign="center">
                    <Box sx={{ color: "#90CAF9" }}>{step.icon}</Box>
                    <Typography variant="h5" sx={{ color: "primary.main" }}>
                      {step.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {step.description}
                    </Typography>
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Features Section */}
        <Grid container spacing={3} sx={{ py: 4 }}>
          {[
            {
              icon: <Podcasts sx={{ fontSize: 40, color: "#90CAF9" }} />,
              title: "Multiple Voice Styles",
              description:
                "Choose from a variety of AI voices with different personalities and tones",
            },
            {
              icon: <Security sx={{ fontSize: 40, color: "#90CAF9" }} />,
              title: "Secure Processing",
              description:
                "Your content is processed with enterprise-grade security and encryption",
            },
            {
              icon: <MusicNote sx={{ fontSize: 40, color: "#90CAF9" }} />,
              title: "Background Scoring",
              description:
                "Add ambient music and sound effects to enhance your podcast",
            },
          ].map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <FeatureBox>
                <Stack spacing={2} alignItems="center" textAlign="center">
                  {feature.icon}
                  <Typography variant="h6" color="primary">
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </Stack>
              </FeatureBox>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
