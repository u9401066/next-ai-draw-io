import type { Metadata } from "next"
import { DiagramProvider } from "@/contexts/diagram-context"
import { DictionaryProvider } from "@/hooks/use-dictionary"
import { getDictionary } from "@/lib/i18n/dictionaries"
import "./globals.css"

// Our root page uses useSearchParams, so it can't be statically generated
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
    title: "Next AI Draw.io",
    description: "AI-Powered Diagram Generator",
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const dictionary = await getDictionary("en")

    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <DictionaryProvider dictionary={dictionary}>
                    <DiagramProvider>{children}</DiagramProvider>
                </DictionaryProvider>
            </body>
        </html>
    )
}
