import { Inter } from 'next/font/google'
import '@/styles/globals.css';
import { AppConfig } from "@/utils/appConfig"; 
import ToastProvider from '@components/alert/ToastProvider';
import { Toaster } from "@/components/ui/sonner";
import { GuideProvider } from '@/components/ui/GuideComponent'

export const metadata = {
  title: "Duluin Workspace",
  description: "Manage your forms",
  icons: AppConfig.icons
};
const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="theme-3">
      <head>
        <meta charSet="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>
        <title>TeamChat - Collaboration App</title>
      </head>
      <body className={`${inter.className} bg-gray-100 dark:bg-gray-900`}>
        <GuideProvider>
          <div className="flex h-screen overflow-hidden">
            {children}
          </div>
        </GuideProvider>
        <ToastProvider />
        <Toaster richColors position='bottom-center' />
      </body>    
    </html>
  );
}