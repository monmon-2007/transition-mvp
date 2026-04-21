import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider, AuthGate } from "../components/auth/AuthProvider";
import Header from "../components/Header";
import PostHogProvider from "../components/PostHogProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = "https://www.novapivots.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "NovaPivots — Your Career Transition Plan",
    template: "%s | NovaPivots",
  },
  description:
    "From laid off to focused. NovaPivots gives you a personalized action plan for your severance, benefits, finances, and job search — built around your specific situation, not generic advice.",
  keywords: [
    "career transition",
    "layoff help",
    "job search plan",
    "severance guide",
    "career pivot",
    "laid off what to do",
    "job loss action plan",
    "career change tool",
    "resume builder",
    "job search tracker",
  ],
  authors: [{ name: "NovaPivots" }],
  creator: "NovaPivots",
  publisher: "NovaPivots",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "NovaPivots",
    title: "NovaPivots — Your Career Transition Plan",
    description:
      "From laid off to focused. A personalized action plan for your severance, benefits, finances, and job search — built around your situation.",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "NovaPivots — Your Career Transition Plan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NovaPivots — Your Career Transition Plan",
    description:
      "From laid off to focused. A personalized action plan for your severance, benefits, finances, and job search.",
    images: [`${APP_URL}/og-image.png`],
  },
  alternates: {
    canonical: APP_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <PostHogProvider>
            <Suspense fallback={<div />}>
              <AuthGate>
                <Header />
                {children}
              </AuthGate>
            </Suspense>
          </PostHogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
