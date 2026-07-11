import { Brightness4, Brightness7 } from "@mui/icons-material";
import { IconButton, SxProps, Theme } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface ColorModeSelectProps {
  sx?: SxProps<Theme>;
}

export default function ColorModeSelect({ sx }: ColorModeSelectProps) {
  const theme = useTheme();

  return (
    <IconButton sx={sx} color="inherit">
      {theme.palette.mode === "dark" ? (
        <Brightness7 />
      ) : (
        <Brightness4 />
      )}
    </IconButton>
  );
}
