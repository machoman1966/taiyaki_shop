'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Supabase 客戶端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// 管理員 Discord ID
const ADMIN_ID = '592515542208872555'

export default function Home() {
  const [user, setUser] = useState(null)
  const [dbUser, setDbUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 初始化：檢查登入狀態
  useEffect(() => {
    // 檢查 URL 參數（OAuth callback）
    const urlParams = new URLSearchParams(window.location.search)
    const userParam = urlParams.get('user')
    const errorParam = urlParams.get('error')

    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      setLoading(false)
      // 清除 URL 參數
      window.history.replaceState({}, '', '/')
      return
    }

    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam))
        setUser(userData)
        // 儲存到 localStorage
        localStorage.setItem('discord_user', JSON.stringify(userData))
        // 清除 URL 參數
        window.history.replaceState({}, '', '/')
        // 載入資料庫用戶資料
        loadDbUser(userData.id)
      } catch (e) {
        console.error('Parse user error:', e)
      }
    } else {
      // 檢查 localStorage
      const savedUser = localStorage.getItem('discord_user')
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser)
          setUser(userData)
          loadDbUser(userData.id)
        } catch (e) {
          localStorage.removeItem('discord_user')
        }
      }
    }
    setLoading(false)
  }, [])

  // 載入資料庫用戶資料（點數等）
  const loadDbUser = async (discordId) => {
    if (!supabase) return
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', discordId)
      .single()

    if (data) {
      setDbUser(data)
    } else {
      // 用戶不存在於資料庫
      setDbUser({ points: 0, notFound: true })
    }
  }

  // 登出
  const handleLogout = () => {
    setUser(null)
    setDbUser(null)
    localStorage.removeItem('discord_user')
  }

  // Discord 登入
  const handleLogin = () => {
    window.location.href = '/api/auth/login'
  }

  // 載入中
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-orange-600">載入中...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* 標題 */}
      <div className="text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-bold text-orange-600 mb-2">
          🐟 鯛魚燒商城
        </h1>
        <p className="text-gray-600">使用鯛魚燒點數兌換精美獎品</p>
        
        {/* 管理員入口 */}
        {user && user.id === ADMIN_ID && (
          <a 
            href="/admin" 
            className="inline-block mt-2 text-sm text-orange-500 hover:text-orange-700 underline"
          >
            🔧 管理後台
          </a>
        )}
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="max-w-md mx-auto mb-6 p-4 bg-red-100 text-red-700 rounded-lg text-center">
          {error}
        </div>
      )}

      {/* 未登入狀態 */}
      {!user ? (
        <div className="max-w-lg mx-auto">
          {/* 登入區塊 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">🔑 登入</h2>
            <p className="text-gray-600 text-center mb-6">
              使用 Discord 帳號登入以查看點數和兌換獎品
            </p>
            <button
              onClick={handleLogin}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              使用 Discord 登入
            </button>
          </div>

          {/* 抽獎規則區塊 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📜 規則說明</h2>
            
            <div className="space-y-4 text-gray-700">
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-bold text-orange-700 mb-2">🏠 關於本站</h3>
                <p className="text-sm">
                  本網頁為 35p 的菁英植物園 Discord 伺服器內部點數兌換區，
                  點數僅能透過伺服器內活動獲得。
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-bold text-blue-700 mb-2">📦 運費說明</h3>
                <p className="text-sm mb-2">
                  獎品運費由得獎者負擔，無論地球上哪個角落都寄給你！
                </p>
                <div className="text-sm">
                  <p className="font-medium">台灣地區運費參考：</p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>7-11 賣貨便：58 元</li>
                    <li>郵政掛號：80 元</li>
                  </ul>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-bold text-green-700 mb-2">🎰 福引說明</h3>
                <ul className="text-sm space-y-1">
                  <li>• 單抽：消耗 <span className="font-bold text-orange-600">3 個鯛魚燒</span></li>
                  <li>• 十連抽：消耗 <span className="font-bold text-orange-600">30 個鯛魚燒</span>，額外贈送 <span className="font-bold text-orange-600">3 個鯛魚燒</span></li>
                  <li>• 每 35 抽達成天井，可選擇指定獎品</li>
                </ul>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-bold text-purple-700 mb-2">🎁 兌換方式</h3>
                <ul className="text-sm space-y-1">
                  <li>• 中獎後請至賣貨便下單付運費</li>
                  <li>• 或選擇郵寄，填寫收件資料</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 已登入狀態 */
        <div className="max-w-4xl mx-auto">
          {/* 用戶資訊卡片 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* 頭像 */}
                <img 
                  src={user.avatar} 
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full border-4 border-orange-200"
                />
                <div>
                  <p className="text-gray-600 text-sm">歡迎回來</p>
                  <p className="text-xl font-bold text-gray-800">{user.displayName}</p>
                  <p className="text-gray-500 text-sm">@{user.username}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">你的鯛魚燒</p>
                <p className="text-3xl font-bold text-orange-600">
                  🐟 {dbUser?.points?.toLocaleString() || 0} 個
                </p>
                {dbUser?.notFound && (
                  <p className="text-xs text-red-500 mt-1">
                    尚未在伺服器獲得點數
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-end">
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                登出
              </button>
            </div>
          </div>

          {/* 功能區塊預留位置 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">
            <p className="text-2xl mb-2">🚧</p>
            <p>功能分頁開發中...</p>
            <p className="text-sm mt-2">下一步會加入：兌換獎品、福引抽獎、郵寄資料、兌換碼</p>
          </div>
        </div>
      )}

      {/* 頁尾 */}
      <footer className="text-center mt-12 text-gray-500 text-sm">
        <p>在 Discord 使用 /鯛魚燒 查看點數</p>
        <p className="mt-1">巫女様神社 ⛩️</p>
      </footer>
    </main>
  )
}
