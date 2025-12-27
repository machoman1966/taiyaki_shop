'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const ADMIN_ID = '592515542208872555'

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [adminId, setAdminId] = useState('')
  const [activeTab, setActiveTab] = useState('rewards')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // 資料
  const [rewards, setRewards] = useState([])
  const [prizes, setPrizes] = useState([])
  const [orders, setOrders] = useState([])

  // 表單
  const [rewardForm, setRewardForm] = useState({ name: '', cost: '', quantity: '', description: '', image_url: '' })
  const [prizeForm, setPrizeForm] = useState({ name: '', quantity: '', probability: '0.01', description: '', image_url: '' })
  const [editingReward, setEditingReward] = useState(null)
  const [editingPrize, setEditingPrize] = useState(null)

  // 圖片上傳
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    // 檢查 localStorage
    const savedId = localStorage.getItem('admin_discord_id')
    if (savedId === ADMIN_ID) {
      setIsAuthorized(true)
      setAdminId(savedId)
    }
  }, [])

  useEffect(() => {
    if (isAuthorized && supabase) {
      loadAllData()
    }
  }, [isAuthorized])

  const loadAllData = async () => {
    await Promise.all([loadRewards(), loadPrizes(), loadOrders()])
  }

  const loadRewards = async () => {
    const { data } = await supabase.from('rewards').select('*').order('id', { ascending: true })
    if (data) setRewards(data)
  }

  const loadPrizes = async () => {
    const { data } = await supabase.from('prizes').select('*').order('id', { ascending: true })
    if (data) setPrizes(data)
  }

  const loadOrders = async () => {
    const { data } = await supabase
      .from('shipping_orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setOrders(data)
  }

  // 登入驗證
  const handleAdminLogin = () => {
    if (adminId === ADMIN_ID) {
      setIsAuthorized(true)
      localStorage.setItem('admin_discord_id', adminId)
      setMessage({ text: '✅ 驗證成功', type: 'success' })
    } else {
      setMessage({ text: '❌ 權限不足', type: 'error' })
    }
  }

  // 上傳圖片
  const handleImageUpload = async (file, type) => {
    if (!file) return null
    setUploading(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${type}_${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file)

      if (error) throw error

      // 取得公開 URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      setUploading(false)
      return urlData.publicUrl
    } catch (err) {
      console.error('Upload error:', err)
      setUploading(false)
      setMessage({ text: '圖片上傳失敗', type: 'error' })
      return null
    }
  }

  // 新增/編輯獎品
  const handleSaveReward = async () => {
    if (!rewardForm.name || !rewardForm.cost || !rewardForm.quantity) {
      setMessage({ text: '請填寫必填欄位', type: 'error' })
      return
    }

    setLoading(true)
    try {
      const data = {
        name: rewardForm.name,
        cost: parseInt(rewardForm.cost),
        quantity: parseInt(rewardForm.quantity),
        description: rewardForm.description || null,
        image_url: rewardForm.image_url || null
      }

      if (editingReward) {
        await supabase.from('rewards').update(data).eq('id', editingReward.id)
        setMessage({ text: '✅ 獎品已更新', type: 'success' })
      } else {
        await supabase.from('rewards').insert(data)
        setMessage({ text: '✅ 獎品已新增', type: 'success' })
      }

      setRewardForm({ name: '', cost: '', quantity: '', description: '', image_url: '' })
      setEditingReward(null)
      loadRewards()
    } catch (err) {
      setMessage({ text: '操作失敗', type: 'error' })
    }
    setLoading(false)
  }

  // 刪除獎品
  const handleDeleteReward = async (id) => {
    if (!confirm('確定要刪除此獎品嗎？')) return
    await supabase.from('rewards').delete().eq('id', id)
    setMessage({ text: '✅ 已刪除', type: 'success' })
    loadRewards()
  }

  // 編輯獎品
  const startEditReward = (reward) => {
    setEditingReward(reward)
    setRewardForm({
      name: reward.name,
      cost: reward.cost.toString(),
      quantity: reward.quantity.toString(),
      description: reward.description || '',
      image_url: reward.image_url || ''
    })
  }

  // 新增/編輯福引獎品
  const handleSavePrize = async () => {
    if (!prizeForm.name || !prizeForm.quantity) {
      setMessage({ text: '請填寫必填欄位', type: 'error' })
      return
    }

    setLoading(true)
    try {
      const data = {
        name: prizeForm.name,
        quantity: parseInt(prizeForm.quantity),
        probability: parseFloat(prizeForm.probability),
        description: prizeForm.description || null,
        image_url: prizeForm.image_url || null
      }

      if (editingPrize) {
        await supabase.from('prizes').update(data).eq('id', editingPrize.id)
        setMessage({ text: '✅ 福引獎品已更新', type: 'success' })
      } else {
        await supabase.from('prizes').insert(data)
        setMessage({ text: '✅ 福引獎品已新增', type: 'success' })
      }

      setPrizeForm({ name: '', quantity: '', probability: '0.01', description: '', image_url: '' })
      setEditingPrize(null)
      loadPrizes()
    } catch (err) {
      setMessage({ text: '操作失敗', type: 'error' })
    }
    setLoading(false)
  }

  // 刪除福引獎品
  const handleDeletePrize = async (id) => {
    if (!confirm('確定要刪除此福引獎品嗎？')) return
    await supabase.from('prizes').delete().eq('id', id)
    setMessage({ text: '✅ 已刪除', type: 'success' })
    loadPrizes()
  }

  // 編輯福引獎品
  const startEditPrize = (prize) => {
    setEditingPrize(prize)
    setPrizeForm({
      name: prize.name,
      quantity: prize.quantity.toString(),
      probability: prize.probability.toString(),
      description: prize.description || '',
      image_url: prize.image_url || ''
    })
  }

  // 更新訂單狀態
  const updateOrderStatus = async (id, status) => {
    await supabase.from('shipping_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setMessage({ text: '✅ 狀態已更新', type: 'success' })
    loadOrders()
  }

  // 未授權畫面
  if (!isAuthorized) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">🔐 管理後台</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discord ID</label>
              <input
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="輸入管理員 Discord ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
            </div>
            <button
              onClick={handleAdminLogin}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg"
            >
              驗證
            </button>
            {message.text && (
              <p className={`text-center ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                {message.text}
              </p>
            )}
            <a href="/" className="block text-center text-gray-500 hover:text-gray-700 text-sm">
              ← 返回商城
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* 標題 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-orange-600">🔧 管理後台</h1>
        <a href="/" className="text-gray-500 hover:text-gray-700">← 返回商城</a>
      </div>

      {/* 訊息 */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* 分頁 */}
      <div className="flex bg-white rounded-xl shadow p-1 mb-6">
        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            activeTab === 'rewards' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-orange-100'
          }`}
        >
          🎁 兌換獎品
        </button>
        <button
          onClick={() => setActiveTab('prizes')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            activeTab === 'prizes' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-orange-100'
          }`}
        >
          🎰 福引獎品
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            activeTab === 'orders' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-orange-100'
          }`}
        >
          📦 郵寄訂單
        </button>
      </div>

      {/* 兌換獎品管理 */}
      {activeTab === 'rewards' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* 表單 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">{editingReward ? '編輯獎品' : '新增獎品'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名稱 *</label>
                <input
                  type="text"
                  value={rewardForm.name}
                  onChange={(e) => setRewardForm({...rewardForm, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">所需點數 *</label>
                  <input
                    type="number"
                    value={rewardForm.cost}
                    onChange={(e) => setRewardForm({...rewardForm, cost: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">數量 *</label>
                  <input
                    type="number"
                    value={rewardForm.quantity}
                    onChange={(e) => setRewardForm({...rewardForm, quantity: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">說明</label>
                <textarea
                  value={rewardForm.description}
                  onChange={(e) => setRewardForm({...rewardForm, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">圖片</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const url = await handleImageUpload(e.target.files[0], 'reward')
                    if (url) setRewardForm({...rewardForm, image_url: url})
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {uploading && <p className="text-sm text-gray-500">上傳中...</p>}
                {rewardForm.image_url && (
                  <img src={rewardForm.image_url} alt="preview" className="mt-2 h-20 object-cover rounded" />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveReward}
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg"
                >
                  {editingReward ? '更新' : '新增'}
                </button>
                {editingReward && (
                  <button
                    onClick={() => {
                      setEditingReward(null)
                      setRewardForm({ name: '', cost: '', quantity: '', description: '', image_url: '' })
                    }}
                    className="px-4 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 rounded-lg"
                  >
                    取消
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 列表 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">獎品列表 ({rewards.length})</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {rewards.map((reward) => (
                <div key={reward.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {reward.image_url ? (
                    <img src={reward.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-orange-100 rounded flex items-center justify-center">🎁</div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{reward.name}</p>
                    <p className="text-sm text-gray-500">💰 {reward.cost} 點 | 剩餘 {reward.quantity}</p>
                  </div>
                  <button onClick={() => startEditReward(reward)} className="text-blue-500 hover:text-blue-700">✏️</button>
                  <button onClick={() => handleDeleteReward(reward.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 福引獎品管理 */}
      {activeTab === 'prizes' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* 表單 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">{editingPrize ? '編輯福引獎品' : '新增福引獎品'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名稱 *</label>
                <input
                  type="text"
                  value={prizeForm.name}
                  onChange={(e) => setPrizeForm({...prizeForm, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">數量 *</label>
                  <input
                    type="number"
                    value={prizeForm.quantity}
                    onChange={(e) => setPrizeForm({...prizeForm, quantity: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">機率</label>
                  <input
                    type="number"
                    step="0.001"
                    value={prizeForm.probability}
                    onChange={(e) => setPrizeForm({...prizeForm, probability: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">說明</label>
                <textarea
                  value={prizeForm.description}
                  onChange={(e) => setPrizeForm({...prizeForm, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">圖片</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const url = await handleImageUpload(e.target.files[0], 'prize')
                    if (url) setPrizeForm({...prizeForm, image_url: url})
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {uploading && <p className="text-sm text-gray-500">上傳中...</p>}
                {prizeForm.image_url && (
                  <img src={prizeForm.image_url} alt="preview" className="mt-2 h-20 object-cover rounded" />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSavePrize}
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg"
                >
                  {editingPrize ? '更新' : '新增'}
                </button>
                {editingPrize && (
                  <button
                    onClick={() => {
                      setEditingPrize(null)
                      setPrizeForm({ name: '', quantity: '', probability: '0.01', description: '', image_url: '' })
                    }}
                    className="px-4 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 rounded-lg"
                  >
                    取消
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 列表 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">福引獎品列表 ({prizes.length})</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {prizes.map((prize) => (
                <div key={prize.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {prize.image_url ? (
                    <img src={prize.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-orange-100 rounded flex items-center justify-center">🎰</div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{prize.name}</p>
                    <p className="text-sm text-gray-500">機率 {prize.probability} | 剩餘 {prize.quantity}</p>
                  </div>
                  <button onClick={() => startEditPrize(prize)} className="text-blue-500 hover:text-blue-700">✏️</button>
                  <button onClick={() => handleDeletePrize(prize.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 郵寄訂單管理 */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">郵寄訂單 ({orders.length})</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">目前沒有郵寄訂單</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">時間</th>
                    <th className="px-4 py-2 text-left">Discord ID</th>
                    <th className="px-4 py-2 text-left">獎品</th>
                    <th className="px-4 py-2 text-left">收件人</th>
                    <th className="px-4 py-2 text-left">電話</th>
                    <th className="px-4 py-2 text-left">地址</th>
                    <th className="px-4 py-2 text-left">狀態</th>
                    <th className="px-4 py-2 text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t">
                      <td className="px-4 py-2 text-sm">{new Date(order.created_at).toLocaleString('zh-TW')}</td>
                      <td className="px-4 py-2 text-sm">{order.discord_id}</td>
                      <td className="px-4 py-2">{order.item_name}</td>
                      <td className="px-4 py-2">{order.recipient_name}</td>
                      <td className="px-4 py-2">{order.phone}</td>
                      <td className="px-4 py-2 text-sm max-w-xs truncate">{order.address}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'pending' ? '待處理' :
                           order.status === 'shipped' ? '已寄出' :
                           order.status === 'completed' ? '已完成' : order.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="pending">待處理</option>
                          <option value="shipped">已寄出</option>
                          <option value="completed">已完成</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
