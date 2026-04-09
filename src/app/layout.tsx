import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'R-Splunk Log Analyzer',
  description: 'Privacy-First Desktop Log Analyzer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-near-black">{children}</body>
    </html>
  );
}
