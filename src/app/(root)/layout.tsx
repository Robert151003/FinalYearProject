
import React, { ReactNode } from 'react'
import StreamVideoProvider from '../../../providers/StreamClientProvider'
import { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';

export const metadata: Metadata = {
  title: "Unify",
  description: "Video Conferencing App",
  icons:{
    icon: '/icons/logo.svg'
  },
};

const RootLayout = ({children}: {children: ReactNode}) => {
  return (
    <main>
      <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >

        <StreamVideoProvider>
          {children}
        </StreamVideoProvider>

      </ThemeProvider>
        
    </main>
  )
}

export default RootLayout