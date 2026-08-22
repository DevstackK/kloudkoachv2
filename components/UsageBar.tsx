"use client";

import { Box, LinearProgress, Typography } from "@mui/material";
import type { UsageFeature } from "@/lib/AuthProvider";

export default function UsageBar({ feature }: { feature: UsageFeature }) {
  const isUnlimited = feature.limit === -1;
  const used = isUnlimited ? 0 : Math.max(feature.limit - feature.remaining, 0);
  const percentUsed = isUnlimited ? 0 : feature.limit === 0 ? 100 : Math.min((used / feature.limit) * 100, 100);
  const isExhausted = !isUnlimited && feature.remaining <= 0;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.5 }}>
        <Typography variant="body2" fontWeight={600}>
          {feature.displayName}
        </Typography>
        <Typography variant="caption" color={isExhausted ? "error.main" : "text.secondary"} fontWeight={isExhausted ? 700 : 400}>
          {isUnlimited ? "Unlimited" : `${used} / ${feature.limit}`}
        </Typography>
      </Box>
      {!isUnlimited && (
        <LinearProgress
          variant="determinate"
          value={percentUsed}
          color={isExhausted ? "error" : percentUsed >= 80 ? "warning" : "primary"}
          sx={{ height: 6, borderRadius: 3, bgcolor: "action.hover" }}
        />
      )}
      {isUnlimited && <LinearProgress variant="determinate" value={100} color="secondary" sx={{ height: 6, borderRadius: 3, opacity: 0.5 }} />}
    </Box>
  );
}
