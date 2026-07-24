"use client";

import * as React from "react";
import { Container, Paper, Typography, Box, Button, TextField, IconButton, List, ListItem, ListItemText, Alert, CircularProgress, Divider } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";

type Device = {
  id: string;
  label: string | null;
  lastSeenAt: string;
  createdAt: string;
};

export default function ExtensionPage() {
  const [code, setCode] = React.useState<string | null>(null);
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const loadDevices = React.useCallback(async () => {
    try {
      const res = await fetch("/api/extension/pair", { credentials: "include" });
      const json = await res.json();
      if (json.success) setDevices(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleGenerate = async () => {
    setGenerating(true);
    setCopied(false);
    try {
      const res = await fetch("/api/extension/pair", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setCode(json.data.deviceToken);
        await loadDevices();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await fetch(`/api/extension/devices/${id}`, { method: "DELETE", credentials: "include" });
    await loadDevices();
  };

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6, flex: 1 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Connect the Chrome Extension
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Generate a pairing code, then paste it into the Kloud Koach extension popup to connect it to your account.
          This lets the extension listen to a live meeting tab (Zoom, Meet, Teams, DingTalk web) and show suggested
          answers in a side panel.
        </Typography>

        {code ? (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Your pairing code (paste this into the extension popup):
            </Typography>
            <Box display="flex" gap={1} mt={1}>
              <TextField value={code} fullWidth size="small" InputProps={{ readOnly: true, sx: { fontFamily: "monospace" } }} />
              <IconButton onClick={handleCopy} color="primary">
                <ContentCopyIcon />
              </IconButton>
            </Box>
            {copied && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Copied to clipboard.
              </Alert>
            )}
          </Box>
        ) : (
          <Button variant="contained" onClick={handleGenerate} disabled={generating} sx={{ mb: 3, borderRadius: "12px" }}>
            {generating ? <CircularProgress size={20} color="inherit" /> : "Generate Pairing Code"}
          </Button>
        )}

        <Divider sx={{ my: 2 }}>
          <Typography variant="caption">Connected Devices</Typography>
        </Divider>

        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={22} />
          </Box>
        ) : devices.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center">
            No devices connected yet.
          </Typography>
        ) : (
          <List dense>
            {devices.map((d) => (
              <ListItem
                key={d.id}
                secondaryAction={
                  <IconButton edge="end" color="error" onClick={() => handleRevoke(d.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText primary={d.label || "Device"} secondary={`Last used ${new Date(d.lastSeenAt).toLocaleString()}`} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
}
