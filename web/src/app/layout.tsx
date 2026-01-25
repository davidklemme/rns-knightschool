import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KnightSchool - Learn Chess the Fun Way',
  description: 'An intelligent chess app that teaches kids strategies as they play',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
