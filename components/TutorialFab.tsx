"use client";

import * as React from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Fab, Tooltip, keyframes } from "@mui/material";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(123, 31, 162, 0.6); }
  70% { box-shadow: 0 0 0 14px rgba(123, 31, 162, 0); }
  100% { box-shadow: 0 0 0 0 rgba(123, 31, 162, 0); }
`;

export default function TutorialFab() {
  const pathname = usePathname();
  if (pathname === "/dashboard/help") return null;

  return (
    <Tooltip title="New here? Watch the 90-second tutorial" placement="left">
      <Fab
        component={NextLink}
        href="/dashboard/help"
        color="secondary"
        aria-label="Watch the tutorial"
        sx={{
          position: "fixed",
          bottom: { xs: 20, md: 32 },
          right: { xs: 20, md: 32 },
          zIndex: 1200,
          animation: `${pulse} 2s infinite`,
        }}
      >
        <OndemandVideoIcon />
      </Fab>
    </Tooltip>
  );
}
