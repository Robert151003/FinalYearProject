import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const protectedRoutes = createRouteMatcher([
  '/',
  '/upcoming',
  '/previous',
  '/recordings',
  '/personal-room',
  '/meeting(.*)',
  '/mmg'
])

export default clerkMiddleware((auth, req) => {
  if(protectedRoutes(req)) auth().protect()
})

export const config = {
  matcher: [
    
  ],
}