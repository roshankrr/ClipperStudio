import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PeakCut Studio · Vertical Shorts & Clip Engine',
  description:
    'Turn long streams and VODs into vertical shorts with heatmap peak detection, word-sync subtitles, and multi-format studio templates. 100% free and local.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" data-type="software">
      <head>
        <meta name="site-kind" content="software" />
        <meta name="page-type" content="software" />
      </head>
      <body className="min-h-screen bg-[#080A0F] text-stone-100 antialiased selection:bg-brand selection:text-[#080A0F]">
        {children}
      </body>
    </html>
  );
}
