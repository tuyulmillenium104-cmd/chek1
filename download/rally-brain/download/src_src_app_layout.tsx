{
  "code": 200,
  "data": {
    "description": "",
    "html": "<html><head><meta name=\"color-scheme\" content=\"light dark\"></head><body><pre style=\"word-wrap: break-word; white-space: pre-wrap;\">import type { Metadata } from 'next'\nimport { Inter } from 'next/font/google'\nimport './globals.css'\nimport { Providers } from './providers'\n\nconst inter = Inter({ subsets: ['latin'] })\n\nexport const metadata: Metadata = {\n  title: 'Rally Command Center v17.0',\n  description: 'AI-Powered Rally Campaign Command Center',\n}\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\" suppressHydrationWarning>\n      <body className={inter.className}>\n        <Providers>{children}</Providers>\n      </body>\n    </html>\n  )\n}\n</pre></body></html>",
    "title": "",
    "url": "https://raw.githubusercontent.com/tuyulmillenium104-cmd/chek1/rally-command-center-v17/src/app/layout.tsx",
    "usage": {
      "tokens": 175
    }
  },
  "meta": {
    "usage": {
      "tokens": 175
    }
  },
  "status": 20000
}