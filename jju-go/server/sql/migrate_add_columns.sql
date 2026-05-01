-- ============================================================
-- 九院易购 数据库幂等性迁移脚本
-- 适用于 Navicat 直接执行
-- ============================================================

USE jjugo_db;

DELIMITER $$

DROP PROCEDURE IF EXISTS add_columns_if_not_exists$$

CREATE PROCEDURE add_columns_if_not_exists()
BEGIN
    -- ===== goods 表字段迁移 =====
    
    -- seller_student_info
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'goods' AND COLUMN_NAME = 'seller_student_info') THEN
        ALTER TABLE goods ADD COLUMN seller_student_info JSON COMMENT '卖家学生信息';
    END IF;
    
    -- preferred_time_slots
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'goods' AND COLUMN_NAME = 'preferred_time_slots') THEN
        ALTER TABLE goods ADD COLUMN preferred_time_slots JSON COMMENT '期望交易时间数组';
    END IF;
    
    -- preferred_location
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'goods' AND COLUMN_NAME = 'preferred_location') THEN
        ALTER TABLE goods ADD COLUMN preferred_location VARCHAR(200) COMMENT '期望交易地点';
    END IF;
    
    -- goods status 索引
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'goods' AND INDEX_NAME = 'idx_goods_status') THEN
        ALTER TABLE goods ADD INDEX idx_goods_status (status);
    END IF;
    
    -- ===== orders 表字段迁移 =====
    
    -- payment_deadline
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'payment_deadline') THEN
        ALTER TABLE orders ADD COLUMN payment_deadline TIMESTAMP NULL COMMENT '付款截止时间';
    END IF;
    
    -- delivery_deadline
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'delivery_deadline') THEN
        ALTER TABLE orders ADD COLUMN delivery_deadline TIMESTAMP NULL COMMENT '交易截止时间';
    END IF;
    
    -- review_deadline
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'review_deadline') THEN
        ALTER TABLE orders ADD COLUMN review_deadline TIMESTAMP NULL COMMENT '评价截止时间';
    END IF;
    
    -- trade_code_expire
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'trade_code_expire') THEN
        ALTER TABLE orders ADD COLUMN trade_code_expire TIMESTAMP NULL COMMENT '交易码过期时间';
    END IF;
    
    -- trade_code
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'trade_code') THEN
        ALTER TABLE orders ADD COLUMN trade_code VARCHAR(6) COMMENT '6位数字交易码';
    END IF;
    
    -- orders status 索引
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_orders_status') THEN
        ALTER TABLE orders ADD INDEX idx_orders_status (status);
    END IF;
    
    -- ===== comments 表字段迁移 =====
    
    -- is_verified_buyer
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'is_verified_buyer') THEN
        ALTER TABLE comments ADD COLUMN is_verified_buyer TINYINT(1) DEFAULT 0 COMMENT '是否为真实交易过的买家';
    END IF;
    
    -- visibility
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'visibility') THEN
        ALTER TABLE comments ADD COLUMN visibility ENUM('public','private') DEFAULT 'public' COMMENT '公开/私密';
    END IF;
    
    -- comments visibility 索引
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = 'jjugo_db' AND TABLE_NAME = 'comments' AND INDEX_NAME = 'idx_comments_visibility') THEN
        ALTER TABLE comments ADD INDEX idx_comments_visibility (visibility);
    END IF;
    
    SELECT '数据库迁移完成！' AS result;
END$$

DELIMITER ;

-- 执行存储过程
CALL add_columns_if_not_exists();

-- 验证字段
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'jjugo_db' 
AND TABLE_NAME IN ('goods', 'orders', 'comments')
AND COLUMN_NAME IN (
    'seller_student_info', 'preferred_time_slots', 'preferred_location',
    'payment_deadline', 'delivery_deadline', 'review_deadline', 'trade_code', 'trade_code_expire',
    'is_verified_buyer', 'visibility'
)
ORDER BY TABLE_NAME, COLUMN_NAME;

-- 清理存储过程（可选）
-- DROP PROCEDURE IF EXISTS add_columns_if_not_exists;