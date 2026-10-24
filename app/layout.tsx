import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthWrapper from "./components/AuthWrapper";
import ErrorBoundary from "./components/ErrorBoundary";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AMGOLD",
  description: "Offline billing and invoice management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body
        className="antialiased"
        style={{
          fontFamily: "var(--font-jakarta), 'Segoe UI', sans-serif",
        }}
      >
        <ErrorBoundary>
          <AuthWrapper>{children}</AuthWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}
