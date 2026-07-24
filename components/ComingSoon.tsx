import { Container, Box, Typography, Paper } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";

export default function ComingSoon({ title, phaseNote }: { title: string; phaseNote: string }) {
  return (
    <Container maxWidth="sm" sx={{ py: 10, flex: 1, display: "flex", alignItems: "center" }}>
      <Paper elevation={0} sx={{ p: 6, textAlign: "center", borderRadius: "20px", border: "1px solid", borderColor: "divider", width: "100%" }}>
        <Box sx={{ mb: 2, color: "primary.main" }}>
          <ConstructionIcon sx={{ fontSize: 48 }} />
        </Box>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {phaseNote}
        </Typography>
      </Paper>
    </Container>
  );
}
