import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { AIChat } from "@/components/ai-chat";
import "./globals.css";

import Provider from "@/components/providers/provider";

import "@mysten/dapp-kit/dist/index.css";

export const metadata: Metadata = {
  title: "TaskOS | Cyber-Industrial",
  description: "Next-gen task management on Sui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground font-sans"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Provider>{children}</Provider>
          <AIChat />
        </ThemeProvider>
      </body>
    </html>
  );
}
