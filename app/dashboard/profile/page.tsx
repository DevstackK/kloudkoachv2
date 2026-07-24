"use client";

import { Container, Paper, Box, Typography, Avatar, Chip, Divider, Button } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { useAuth } from "@/lib/AuthProvider";
import { useRouter } from "next/navigation";

export default function UserProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <Container maxWidth="sm" sx={{ py: 6, flex: 1 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: "secondary.main", fontSize: "1.5rem" }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : <PersonIcon />}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {user?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Current Plan
          </Typography>
          <Chip label={user?.planName ?? "Free"} color="primary" size="small" />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Status
          </Typography>
          <Chip label={user?.status ?? "active"} variant="outlined" size="small" />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Button
          fullWidth
          variant="outlined"
          color="error"
          sx={{ borderRadius: "12px" }}
          onClick={async () => {
            await logout();
            router.push("/");
          }}
        >
          Log Out
        </Button>
      </Paper>
    </Container>
  );
}
