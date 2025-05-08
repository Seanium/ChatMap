import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChatMap',
  description: 'An intelligent map and AI assistant specialized in geography, travel, and location-based information.',
  generator: 'ChatMap',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
