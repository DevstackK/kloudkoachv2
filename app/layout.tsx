import type { Metadata } from "next";
import ThemeRegistry from "./ThemeRegistry";
import { AuthProvider } from "@/lib/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kloud Koach — AI-Coaching as a Service",
  description:
    "Kloud Koach brings a personal AI coach to your device instantly, digitally, and securely — real-time interview feedback and live assistance.",
  icons: {
    icon: "/fav-icon.webp",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <AuthProvider>{children}</AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
