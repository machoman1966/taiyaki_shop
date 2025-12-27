import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID
  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://taiyaki-shop.vercel.app/api/auth/callback'
  
  // Discord OAuth2 授權網址
  const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize')
  discordAuthUrl.searchParams.set('client_id', clientId)
  discordAuthUrl.searchParams.set('redirect_uri', redirectUri)
  discordAuthUrl.searchParams.set('response_type', 'code')
  discordAuthUrl.searchParams.set('scope', 'identify')
  
  return NextResponse.redirect(discordAuthUrl.toString())
}
