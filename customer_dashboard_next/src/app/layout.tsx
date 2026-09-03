import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '../providers/Providers';
import { ToastContainer } from '../components/store/Toast';
import GoogleAnalytics from '../components/analytics/GoogleAnalytics';
import StorefrontHeartbeat from '../components/analytics/StorefrontHeartbeat';

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
    >
      <body className="bg-white text-[#0B1D26] font-sans antialiased selection:bg-[#005F63]/20 selection:text-[#005F63] min-h-screen relative overflow-x-clip">
        <Providers>
          <GoogleAnalytics />
          <StorefrontHeartbeat />
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
