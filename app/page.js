'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Supabase 客戶端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// 賣貨便連結
const CONVENIENCE_STORE_LINK = 'https://myship.7-11.com.tw/general/detail/GM2409203695467'

// 管理員 Discord ID
const ADMIN_ID = '592515542208872555'

export default function Home() {
  const [activeTab, setActiveTab] = useState('rewards')
  const [discordId, setDiscordId] = useState('')
  const [user, setUser] = useState(null)
  const [rewards, setRewards] = useState([])
  const [prizes, setPrizes] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  
  // 郵寄表單
  const [shippingForm, setShippingForm] = useState({
    recipientName: '',
    phone: '',
    address: '',
    itemName: '',
    notes: ''
  })

  // 福引動畫
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawResult, setDrawResult] = useState(null)

  // 載入資料
  useEffect(() => {
    if (supabase) {
      loadRewards()
      loadPrizes()
    }
  }, [])

  const loadRewards = async () => {
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .gt('quantity', 0)
      .order('cost', { ascending: true })
    if (data) setRewards(data)
  }

  const loadPrizes = async () => {
    const { data } = await supabase
      .from('prizes')
      .select('*')
      .gt('quantity', 0)
    if (data) setPrizes(data)
  }

  // 登入
  const handleLogin = async () => {
    if (!discordId.trim()) {
      setMessage({ text: '請輸入 Discord ID', type: 'error' })
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('discord_id', discordId.trim())
        .single()

      if (error || !data) {
        setMessage({ text: '找不到此用戶，請確認 Discord ID', type: 'error' })
        setUser(null)
        setIsLoggedIn(false)
      } else {
        setUser(data)
        setIsLoggedIn(true)
        setMessage({ text: '', type: '' })
      }
    } catch (err) {
      setMessage({ text: '查詢失敗，請稍後再試', type: 'error' })
    }
    setLoading(false)
  }

  // 登出
  const handleLogout = () => {
    setUser(null)
    setIsLoggedIn(false)
    setDiscordId('')
    setMessage({ text: '', type: '' })
  }

  // 兌換獎品
  const handleRedeem = async (reward) => {
    if (!user) return
    if (user.points < reward.cost) {
      setMessage({ text: `鯛魚燒不夠！需要 ${reward.cost} 個`, type: 'error' })
      return
    }

    setLoading(true)
    try {
      // 扣點數
      await supabase
        .from('users')
        .update({ points: user.points - reward.cost })
        .eq('discord_id', user.discord_id)

      // 扣獎品
      await supabase
        .from('rewards')
        .update({ quantity: reward.quantity - 1 })
        .eq('id', reward.id)

      // 記錄訂單
      await supabase
        .from('redemption_orders')
        .insert({
          discord_id: user.discord_id,
          item_type: 'reward',
          item_name: reward.name,
          points_spent: reward.cost,
          delivery_method: 'convenience_store'
        })

      setUser({ ...user, points: user.points - reward.cost })
      setMessage({ 
        text: `🎉 成功兌換「${reward.name}」！請到賣貨便下單付運費`, 
        type: 'success',
        link: CONVENIENCE_STORE_LINK
      })
      loadRewards()
    } catch (err) {
      setMessage({ text: '兌換失敗，請稍後再試', type: 'error' })
    }
    setLoading(false)
  }

  // 福引抽獎
  const handleDraw = async () => {
    if (!user) return
    const DRAW_COST = 3

    if (user.points < DRAW_COST) {
      setMessage({ text: `鯛魚燒不夠！需要 ${DRAW_COST} 個`, type: 'error' })
      return
    }

    setIsDrawing(true)
    setDrawResult(null)

    // 扣點數
    await supabase
      .from('users')
      .update({ points: user.points - DRAW_COST })
      .eq('discord_id', user.discord_id)

    setUser({ ...user, points: user.points - DRAW_COST })

    // 模擬抽獎動畫
    setTimeout(async () => {
      // 抽獎邏輯
      const allPrizes = await supabase
        .from('prizes')
        .select('*')
        .gt('quantity', 0)
      
      let result = { name: '⚪ 銘謝惠顧', isWin: false }
      
      if (allPrizes.data && allPrizes.data.length > 0) {
        const totalProb = allPrizes.data.reduce((sum, p) => sum + parseFloat(p.probability), 0)
        const draw = Math.random() * (totalProb + 0.97) // 加上銘謝惠顧的機率
        
        let cumulative = 0
        for (const prize of allPrizes.data) {
          cumulative += parseFloat(prize.probability)
          if (draw < cumulative) {
            result = { name: prize.name, isWin: true, prize }
            // 扣庫存
            await supabase
              .from('prizes')
              .update({ quantity: prize.quantity - 1 })
              .eq('id', prize.id)
            break
          }
        }
      }

      // 記錄抽獎
      await supabase
        .from('draw_records')
        .insert({
          discord_id: user.discord_id,
          draws: 1,
          prize_won: result.name
        })

      setDrawResult(result)
      setIsDrawing(false)
      loadPrizes()

      if (result.isWin) {
        setMessage({
          text: `🎊 恭喜抽中「${result.name}」！請到賣貨便下單付運費`,
          type: 'success',
          link: CONVENIENCE_STORE_LINK
        })
      }
    }, 2000)
  }

  // 送出郵寄資料
  const handleShippingSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    if (!shippingForm.recipientName || !shippingForm.phone || !shippingForm.address || !shippingForm.itemName) {
      setMessage({ text: '請填寫所有必填欄位', type: 'error' })
      return
    }

    setLoading(true)
    try {
      await supabase
        .from('shipping_orders')
        .insert({
          discord_id: user.discord_id,
          discord_name: discordId,
          item_type: 'shipping',
          item_name: shippingForm.itemName,
          recipient_name: shippingForm.recipientName,
          phone: shippingForm.phone,
          address: shippingForm.address,
          notes: shippingForm.notes
        })

      setMessage({ text: '✅ 郵寄資料已送出！管理員會盡快處理', type: 'success' })
      setShippingForm({ recipientName: '', phone: '', address: '', itemName: '', notes: '' })
    } catch (err) {
      setMessage({ text: '送出失敗，請稍後再試', type: 'error' })
    }
    setLoading(false)
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
        {isLoggedIn && user?.discord_id === ADMIN_ID && (
          <a 
            href="/admin" 
            className="inline-block mt-2 text-sm text-orange-500 hover:text-orange-700 underline"
          >
            🔧 管理後台
          </a>
        )}
      </div>

      {/* 登入區塊 */}
      {!isLoggedIn ? (
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🔑 登入查詢</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discord ID
              </label>
              <input
                type="text"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                placeholder="例如：592515542208872555"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Discord 開啟開發者模式 → 右鍵自己 → 複製 ID
              </p>
            </div>
            <button
              onClick={handleLogin}
              disabled={loading || !supabase}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {loading ? '查詢中...' : '登入'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 用戶資訊 */}
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600 text-sm">你的鯛魚燒</p>
                <p className="text-3xl font-bold text-orange-600">
                  🐟 {user.points?.toLocaleString()} 個
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                登出
              </button>
            </div>
          </div>

          {/* 分頁選擇 */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="flex bg-white rounded-xl shadow p-1">
              <button
                onClick={() => setActiveTab('rewards')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                  activeTab === 'rewards'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-orange-100'
                }`}
              >
                🎁 兌換獎品
              </button>
              <button
                onClick={() => setActiveTab('gacha')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                  activeTab === 'gacha'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-orange-100'
                }`}
              >
                🎰 福引抽獎
              </button>
              <button
                onClick={() => setActiveTab('shipping')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                  activeTab === 'shipping'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-orange-100'
                }`}
              >
                📦 郵寄資料
              </button>
            </div>
          </div>
        </>
      )}

      {/* 訊息提示 */}
      {message.text && (
        <div className={`max-w-4xl mx-auto mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <p>{message.text}</p>
          {message.link && (
            <a 
              href={message.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              📦 前往賣貨便下單
            </a>
          )}
        </div>
      )}

      {/* 內容區域 */}
      {isLoggedIn && (
        <div className="max-w-4xl mx-auto">
          {/* 兌換獎品分頁 */}
          {activeTab === 'rewards' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🎁 可兌換獎品</h2>
              {rewards.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">
                  目前沒有可兌換的獎品
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewards.map((reward) => (
                    <div key={reward.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
                      {/* 商品圖片 */}
                      <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                        {reward.image_url ? (
                          <img 
                            src={reward.image_url} 
                            alt={reward.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-6xl">🎁</span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{reward.name}</h3>
                        {reward.description && (
                          <p className="text-sm text-gray-500 mb-2">{reward.description}</p>
                        )}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-orange-600 font-bold">🐟 {reward.cost} 個</span>
                          <span className="text-gray-500 text-sm">剩餘 {reward.quantity}</span>
                        </div>
                        <button
                          onClick={() => handleRedeem(reward)}
                          disabled={loading || user.points < reward.cost}
                          className={`w-full py-2 rounded-lg font-bold transition ${
                            user.points >= reward.cost
                              ? 'bg-orange-500 hover:bg-orange-600 text-white'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {user.points < reward.cost ? '點數不足' : '兌換'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 福引抽獎分頁 */}
          {activeTab === 'gacha' && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🎰 福引抽獎</h2>
              <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
                <p className="text-gray-600 mb-4">每次抽獎消耗 <span className="text-orange-600 font-bold">3 個鯛魚燒</span></p>
                
                {/* 抽獎動畫區 */}
                <div className="h-40 flex items-center justify-center mb-6">
                  {isDrawing ? (
                    <div className="animate-bounce text-6xl">🎰</div>
                  ) : drawResult ? (
                    <div className={`text-4xl font-bold ${drawResult.isWin ? 'text-yellow-500' : 'text-gray-500'}`}>
                      {drawResult.name}
                    </div>
                  ) : (
                    <div className="text-6xl">🐟</div>
                  )}
                </div>

                <button
                  onClick={handleDraw}
                  disabled={loading || isDrawing || user.points < 3}
                  className={`w-full py-3 rounded-lg font-bold text-lg transition ${
                    user.points >= 3 && !isDrawing
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isDrawing ? '抽獎中...' : user.points < 3 ? '點數不足' : '🎲 抽一次！'}
                </button>

                {/* 獎品列表 */}
                <div className="mt-8 text-left">
                  <h3 className="font-bold text-gray-700 mb-2">獎品池</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {prizes.map((prize) => (
                      <div key={prize.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <span>{prize.name}</span>
                        <span className="text-sm text-gray-500">剩 {prize.quantity}</span>
                      </div>
                    ))}
                    {prizes.length === 0 && (
                      <p className="text-gray-500 text-center">暫無獎品</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 郵寄資料分頁 */}
          {activeTab === 'shipping' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📦 郵寄資料</h2>
              <div className="bg-white rounded-2xl shadow-lg p-6 max-w-lg mx-auto">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              
                  <p className="text-yellow-800 text-sm mt-2">
                    📮 此表單僅供選擇<strong>郵寄</strong>方式的用戶填寫。
                  </p>
                </div>

                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      獎品名稱 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingForm.itemName}
                      onChange={(e) => setShippingForm({...shippingForm, itemName: e.target.value})}
                      placeholder="請輸入您要領取的獎品名稱"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      收件人姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingForm.recipientName}
                      onChange={(e) => setShippingForm({...shippingForm, recipientName: e.target.value})}
                      placeholder="真實姓名"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      聯絡電話 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={shippingForm.phone}
                      onChange={(e) => setShippingForm({...shippingForm, phone: e.target.value})}
                      placeholder="09XX-XXX-XXX"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      郵寄地址 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={shippingForm.address}
                      onChange={(e) => setShippingForm({...shippingForm, address: e.target.value})}
                      placeholder="完整郵寄地址（含郵遞區號）"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      備註（選填）
                    </label>
                    <textarea
                      value={shippingForm.notes}
                      onChange={(e) => setShippingForm({...shippingForm, notes: e.target.value})}
                      placeholder="其他需要說明的事項"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
                  >
                    {loading ? '送出中...' : '📮 送出郵寄資料'}
                  </button>
                </form>
              </div>
            </div>
          )}
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
