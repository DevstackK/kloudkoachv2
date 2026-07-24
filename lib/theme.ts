import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

export const getTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            primary: {
              main: "#7b1fa2",
              light: "#ae52d4",
              dark: "#4a0072",
              contrastText: "#ffffff",
            },
            secondary: {
              main: "#ff4081",
              light: "#ff79b0",
              dark: "#c60055",
              contrastText: "#ffffff",
            },
            background: {
              default: "#f8f9fa",
              paper: "#ffffff",
            },
            text: {
              primary: "#1a1a1a",
              secondary: "#666666",
            },
          }
        : {
            primary: {
              main: "#ce93d8",
            },
            secondary: {
              main: "#ff80ab",
            },
            background: {
              default: "#121212",
              paper: "#1e1e1e",
            },
          }),
    },
    typography: {
      fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: "none" },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "25px",
            padding: "10px 24px",
          },
          containedPrimary: {
            background: "linear-gradient(45deg, #7b1fa2 30%, #ce93d8 90%)",
            boxShadow: "0 3px 5px 2px rgba(123, 31, 162, .3)",
          },
          containedSecondary: {
            background: "linear-gradient(45deg, #c2185b 30%, #ff4081 90%)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: "linear-gradient(90deg, #4a148c 0%, #7b1fa2 100%)",
            boxShadow: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: "16px",
          },
        },
      },
    },
  });
