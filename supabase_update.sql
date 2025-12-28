-- =============================================
-- 福引獎品展示功能 - 資料庫更新
-- =============================================

-- 為 prizes 表格新增展示相關欄位
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS rank INTEGER DEFAULT 5;
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS rank_name VARCHAR(50) DEFAULT '五等賞';
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS rank_color VARCHAR(20) DEFAULT '#6B7280';
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS condition VARCHAR(50) DEFAULT '全新';
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

-- 更新現有資料的預設值（可選）
UPDATE prizes SET rank = 5, rank_name = '五等賞', rank_color = '#6B7280' WHERE rank IS NULL;

-- 建立索引以優化排序查詢
CREATE INDEX IF NOT EXISTS idx_prizes_display_order ON prizes(display_order);
CREATE INDEX IF NOT EXISTS idx_prizes_rank ON prizes(rank);

-- =============================================
-- 欄位說明：
-- rank: 數字越小等級越高 (5=五等賞, 1=一等賞, 0=特賞, -1=隱藏獎)
-- rank_name: 顯示名稱 (五等賞、四等賞、特賞、隱藏獎等)
-- rank_color: 顯示顏色 (HEX 色碼)
-- condition: 物品狀態 (全新、拆檢、拆檢無缺損、拆擺)
-- display_order: 排序順序 (數字越小越前面)
-- =============================================

-- 預設顏色參考：
-- 五等賞: #6B7280 (灰色)
-- 四等賞: #10B981 (綠色)
-- 三等賞: #F97316 (橙色)
-- 二等賞: #3B82F6 (藍色)
-- 一等賞: #EF4444 (紅色)
-- 特賞:   #F59E0B (金色)
-- 隱藏獎: #EC4899 (粉色)
