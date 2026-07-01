import type { Metadata } from "next";
import { AppNavigation } from "../features/navigation/app-navigation";

import "./globals.css";

export const metadata: Metadata = {
  title: "Intern Scout",
  description: "インターン生と企業をつなぐスカウトサービス",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AppNavigation />
        {children}
      </body>
    </html>
  );
}
