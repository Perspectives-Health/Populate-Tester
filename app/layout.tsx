import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Populate Tester',
  description: 'A dashboard for prompt testing and production conversation management',
  generator: 'v0.dev',
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
