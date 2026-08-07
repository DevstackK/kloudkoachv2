"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Button, Dialog, DialogTitle, DialogContent, Box, Typography, CircularProgress } from "@mui/material";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";

export default function CompanionQrButton({ sessionId }: { sessionId: string | null }) {
  const [open, setOpen] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpen = async () => {
    if (!sessionId) return;
    setOpen(true);
    setQrDataUrl(null);
    setError(null);
    try {
      const res = await fetch("/api/companion/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Could not create pairing link.");
      const dataUrl = await QRCode.toDataURL(json.data.url, { width: 260, margin: 1 });
      setQrDataUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate QR code.");
    }
  };

  return (
    <>
      <Button variant="outlined" size="small" startIcon={<PhoneIphoneIcon />} onClick={handleOpen} disabled={!sessionId}>
        Show on Phone
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Scan with your phone</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} pb={2}>
            <Typography variant="body2" color="text.secondary" align="center">
              Open your phone&apos;s camera and scan this code to see live answers on your phone, separate from
              whatever you&apos;re sharing on your laptop. If you need to share your screen, tap &quot;Take Over
              Listening&quot; on the phone page to have it listen and coach you directly.
            </Typography>
            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
            {!qrDataUrl && !error && <CircularProgress />}
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Scan to open Kloud Koach companion view" width={260} height={260} />
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
