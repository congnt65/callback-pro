import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CallbackPro - Webhook Inspector',
  description: 'Inspect and debug webhook requests in real-time',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  )
}