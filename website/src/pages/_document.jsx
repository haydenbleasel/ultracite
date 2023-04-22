import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html className="h-full antialiased" lang="en">
      <Head />
      <body className="flex min-h-full flex-col bg-white dark:bg-gray-950">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
