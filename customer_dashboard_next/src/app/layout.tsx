import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '../providers/Providers';
import { ToastContainer } from '../components/store/Toast';
import GoogleAnalytics from '../components/analytics/GoogleAnalytics';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const interDisplay = Inter({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'FAAZO Dental Solutions | Premium Dental Equipment Marketplace',
  description: "FAAZO Dental Solutions is India's leading clinical dental equipment marketplace. Shop genuine dental handpieces, imaging systems, dental chairs, and clinical materials.",
  keywords: ['dental equipment', 'clinical dentistry', 'dental materials', '3M', 'Dentsply Sirona', 'NSK', 'Planmeca', 'dental clinic supply'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${inter.variable} ${interDisplay.variable}`}
      data-scroll-behavior="smooth"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400..900;1,400..900&family=Manrope:wght@400..800&family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800&display=swap"
        />
      </head>
      <body className="bg-white text-[#0B1D26] font-sans antialiased selection:bg-[#005F63]/20 selection:text-[#005F63] min-h-screen relative overflow-x-clip">
        <Providers>
          <GoogleAnalytics />
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
