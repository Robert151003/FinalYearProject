'use client'

import Image from 'next/image'
import React from 'react'
import Link from 'next/link'
import MobileNav from './MobileNav'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
 
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const Navbar = () => {
  return (
    <nav className='flex-between fixed z-50 w-full bg-dark-6 px-6 py-4 lg:px-10 lightMode:bg-dark-1'>
      
      <Link href="/" className="flex items-center gap-1">
        <Image src="/icons/logo.svg" width={32} height={32} alt="Yoom logo" className='max-sm:size-10' />
        <p className='text-[26px] font-extrabold text-white max-sm:hidden'>Unify</p>
      </Link>

      <div className='flex-between gap-5'>
        <SignedIn>
          <UserButton />
        </SignedIn>

        <MobileNav/>       
      </div>
      
    </nav>
  )
   
}

export function ModeToggle() {
  const { setTheme } = useTheme()
 
  return (
    
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className='border-none outline-none' variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='bg-dark-1 border-none outline-none' align="end" >
        <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
      
    </DropdownMenu>
    
    
  )
}

export default Navbar