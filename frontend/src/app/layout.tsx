import './globals.css'
import type { Metadata } from 'next'
import { ThemeProvider } from '../components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Sophia XAI Intelligence | Laboratorios Sophia',
  description: 'Sistema Predictivo Comercial y XAI de Laboratorios Sophia',
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
                var stored = localStorage.getItem('sophia_theme');
                if (stored === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.remove('light');
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
