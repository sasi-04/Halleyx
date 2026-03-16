import "./globals.css";
import React from "react";
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen bg-bg dark:bg-bg-dark text-gray-900 dark:text-gray-50">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

