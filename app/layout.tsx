import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getServerSession } from 'next-auth';
import SessionProvider from './components/SessionProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: "AI Quiz Maker",
  description: "AI-powered quiz generator from your study materials",
  robots: "index, follow",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <AuthProvider>
              <Navigation />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
            </AuthProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

