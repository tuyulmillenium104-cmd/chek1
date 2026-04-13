{
  "code": 200,
  "data": {
    "description": "",
    "html": "<html><head><meta name=\"color-scheme\" content=\"light dark\"></head><body><pre style=\"word-wrap: break-word; white-space: pre-wrap;\">'use client'\nimport { ThemeProvider } from 'next-themes'\nimport { Toaster } from 'sonner'\n\nexport function Providers({ children }: { children: React.ReactNode }) {\n  return (\n    <ThemeProvider attribute=\"class\" defaultTheme=\"dark\" enableSystem disableTransitionOnChange>\n      {children}\n      <Toaster richColors position=\"top-right\" />\n    </ThemeProvider>\n  )\n}\n</pre></body></html>",
    "title": "",
    "url": "https://raw.githubusercontent.com/tuyulmillenium104-cmd/chek1/rally-command-center-v17/src/app/providers.tsx",
    "usage": {
      "tokens": 124
    }
  },
  "meta": {
    "usage": {
      "tokens": 124
    }
  },
  "status": 20000
}