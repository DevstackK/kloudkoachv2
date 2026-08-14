"use client";

import * as React from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  IconButton,
  Menu,
  MenuItem,
  Container,
  Avatar,
  Divider,
  ListItemIcon,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LogoutIcon from "@mui/icons-material/Logout";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import ExtensionIcon from "@mui/icons-material/Extension";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useAuth } from "@/lib/AuthProvider";
import { useColorMode } from "@/app/ThemeRegistry";

const mainNavLinks = [
  { title: "Home", path: "/dashboard" },
  { title: "Live Interview Co-Pilot", path: "/dashboard/interview" },
  { title: "Interview Preparation", path: "/dashboard/interview-preparation" },
  { title: "AI Interviewer", path: "/dashboard/ai-interviewer" },
  { title: "Pronunciation Practice", path: "/dashboard/pronunciation" },
  { title: "Resume Builder", path: "/dashboard/resume-builder" },
];

const userDropdownLinks = [
  { title: "Upgrade Plan", path: "/dashboard/upgrade", icon: <StarIcon fontSize="small" /> },
  { title: "History", path: "/dashboard/history", icon: <HistoryIcon fontSize="small" /> },
  { title: "Connect Extension", path: "/dashboard/extension", icon: <ExtensionIcon fontSize="small" /> },
  { title: "How to Use / Tutorial", path: "/dashboard/help", icon: <HelpOutlineIcon fontSize="small" /> },
  { title: "User Profile", path: "/dashboard/profile", icon: <PersonIcon fontSize="small" /> },
];

export default function Header() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [mobileAnchorEl, setMobileAnchorEl] = React.useState<null | HTMLElement>(null);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    setUserMenuAnchorEl(null);
    setMobileAnchorEl(null);
    await logout();
    router.push("/");
  };

  // pathname.startsWith(path) alone false-positives: "/dashboard/interview"
  // is a string prefix of "/dashboard/interview-preparation", so both would
  // light up on the prep page. Require an exact match or a "/" boundary
  // right after the path.
  const isActive = (path: string) =>
    path === "/dashboard" ? pathname === path : pathname === path || pathname?.startsWith(`${path}/`);

  const getNavStyle = (active: boolean) => ({
    color: "white",
    textDecoration: "none",
    fontWeight: active ? 700 : 500,
    fontSize: "0.9rem",
    padding: "8px 20px",
    borderRadius: "30px",
    backgroundColor: active ? "rgba(255, 255, 255, 0.25)" : "transparent",
    backdropFilter: active ? "blur(4px)" : "none",
    transition: "all 0.3s ease",
    border: active ? "1px solid rgba(255,255,255,0.4)" : "1px solid transparent",
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap" as const,
  });

  return (
    <AppBar position="sticky" elevation={0} sx={{ background: "linear-gradient(90deg, #4a148c 0%, #7b1fa2 100%)", zIndex: 1201 }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ height: 70, justifyContent: "space-between" }}>
          <Box component={NextLink} href="/dashboard" sx={{ display: "flex", alignItems: "center", textDecoration: "none", color: "white", zIndex: 2 }}>
            <SmartToyIcon sx={{ mr: 1.5, fontSize: 32 }} />
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, letterSpacing: ".05rem", fontSize: "1.2rem" }}>
              Kloud Koach
            </Typography>
          </Box>

          {!isMobile && (
            <Box sx={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 1, zIndex: 1 }}>
              {mainNavLinks.map((link) => (
                <Box key={link.title} component={NextLink} href={link.path} sx={getNavStyle(!!isActive(link.path))}>
                  {link.title}
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, zIndex: 2 }}>
            {!isMobile && (
              <>
                <Tooltip title="Account Settings">
                  <IconButton onClick={(e) => setUserMenuAnchorEl(e.currentTarget)} sx={{ p: 0, ml: 1, border: "2px solid rgba(255,255,255,0.5)" }}>
                    <Avatar alt="User" sx={{ bgcolor: "secondary.main", width: 40, height: 40 }}>
                      {user?.name ? user.name.charAt(0).toUpperCase() : <PersonIcon />}
                    </Avatar>
                  </IconButton>
                </Tooltip>

                <Menu
                  sx={{ mt: "45px" }}
                  anchorEl={userMenuAnchorEl}
                  anchorOrigin={{ vertical: "top", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  open={Boolean(userMenuAnchorEl)}
                  onClose={() => setUserMenuAnchorEl(null)}
                  slotProps={{ paper: { elevation: 3, sx: { borderRadius: 2, minWidth: 200, mt: 1.5 } } }}
                >
                  {userDropdownLinks.map((link) => (
                    <MenuItem
                      key={link.title}
                      onClick={() => {
                        setUserMenuAnchorEl(null);
                        router.push(link.path);
                      }}
                    >
                      <ListItemIcon>{link.icon}</ListItemIcon>
                      <Typography>{link.title}</Typography>
                    </MenuItem>
                  ))}

                  <Divider />

                  <MenuItem onClick={toggleColorMode}>
                    <ListItemIcon>{theme.palette.mode === "dark" ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}</ListItemIcon>
                    <Typography>Switch Theme</Typography>
                  </MenuItem>

                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <Typography color="error" fontWeight="bold">
                      Logout
                    </Typography>
                  </MenuItem>
                </Menu>
              </>
            )}

            {isMobile && (
              <IconButton size="large" onClick={(e) => setMobileAnchorEl(e.currentTarget)} color="inherit">
                <MenuIcon />
              </IconButton>
            )}
          </Box>

          <Menu
            anchorEl={mobileAnchorEl}
            open={Boolean(mobileAnchorEl)}
            onClose={() => setMobileAnchorEl(null)}
            sx={{ display: { xs: "block", md: "none" } }}
            slotProps={{ paper: { elevation: 3, sx: { borderRadius: 2, mt: 1, minWidth: 200 } } }}
          >
            {[...mainNavLinks, ...userDropdownLinks].map((link) => (
              <MenuItem
                key={link.title}
                onClick={() => {
                  setMobileAnchorEl(null);
                  router.push(link.path);
                }}
              >
                <Typography>{link.title}</Typography>
              </MenuItem>
            ))}

            <Divider />

            <MenuItem onClick={toggleColorMode}>
              <ListItemIcon>{theme.palette.mode === "dark" ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}</ListItemIcon>
              <Typography>Switch Theme</Typography>
            </MenuItem>

            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              <Typography color="error" fontWeight="bold">
                Logout
              </Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
