import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

interface ForgotPasswordProps {
  open: boolean;
  handleClose: () => void;
}

export default function ForgotPassword({
  open,
  handleClose,
}: ForgotPasswordProps) {
  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Reset Password</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="reset-email"
          label="Email Address"
          type="email"
          fullWidth
          variant="outlined"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleClose}>Send Reset Link</Button>
      </DialogActions>
    </Dialog>
  );
}
