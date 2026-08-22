"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TutorialFab from "@/components/TutorialFab";
import { useAuth } from "@/lib/AuthProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (!user.emailVerified) {
      router.replace("/verify-email");
    }
  }, [loading, user, router]);

  if (loading || !user || !user.emailVerified) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "background.default", color: "text.primary" }}>
      <Header />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</Box>
      <Footer />
      <TutorialFab />
    </Box>
  );
}
