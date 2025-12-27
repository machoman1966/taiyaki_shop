import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
  // 基礎網址
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://taiyaki-shop.vercel.app'
  
  // 如果用戶拒絕授權
  if (error) {
    return NextResponse.redirect(`${baseUrl}?error=授權被拒絕`)
  }
  
  // 如果沒有 code
  if (!code) {
    return NextResponse.redirect(`${baseUrl}?error=授權失敗`)
  }
  
  try {
    // 用 code 換取 access_token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI || 'https://taiyaki-shop.vercel.app/api/auth/callback',
      }),
    })
    
    const tokenData = await tokenResponse.json()
    
    if (!tokenData.access_token) {
      console.error('Token error:', tokenData)
      return NextResponse.redirect(`${baseUrl}?error=無法取得授權`)
    }
    
    // 用 access_token 取得用戶資訊
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })
    
    const userData = await userResponse.json()
    
    if (!userData.id) {
      return NextResponse.redirect(`${baseUrl}?error=無法取得用戶資訊`)
    }
    
    // 建立用戶資料 JSON
    const userInfo = {
      id: userData.id,
      username: userData.username,
      displayName: userData.global_name || userData.username,
      avatar: userData.avatar 
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || '0') % 5}.png`,
    }
    
    // 將用戶資訊編碼後傳回前端
    const userInfoEncoded = encodeURIComponent(JSON.stringify(userInfo))
    
    return NextResponse.redirect(`${baseUrl}?user=${userInfoEncoded}`)
    
  } catch (err) {
    console.error('OAuth error:', err)
    return NextResponse.redirect(`${baseUrl}?error=登入過程發生錯誤`)
  }
}
