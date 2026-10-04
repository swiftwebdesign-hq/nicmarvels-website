import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Niksmarvel Fashion Academy",
  description: "Student enrollment form for Niksmarvel Fashion Academy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
