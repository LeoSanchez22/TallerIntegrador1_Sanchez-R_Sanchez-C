import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sophia XAI Intelligence',
  description: 'Sistema Predictivo Comercial de Laboratorios Sophia',
  icons: {
    icon: '/logo-sophia-color.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
