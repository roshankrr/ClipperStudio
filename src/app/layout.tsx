import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PeakCut Studio - 100% Free AI Stream Clipper',
  description: 'AI clip maker for Twitch, Kick & YouTube streams. Free & unlimited without subscriptions or paywalls.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-dark-frame text-stone-100 antialiased selection:bg-brand selection:text-dark-frame">
        {children}
      </body>
    </html>
  );
}
