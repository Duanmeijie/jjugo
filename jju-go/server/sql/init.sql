CREATE DATABASE IF NOT EXISTS jjugo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jjugo_db;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) UNIQUE NOT NULL COMMENT '学号',
    phone VARCHAR(11) NOT NULL UNIQUE COMMENT '手机号',
    password VARCHAR(255) NOT NULL COMMENT 'BCrypt加密',
    nickname VARCHAR(50) NOT NULL,
    avatar VARCHAR(255) DEFAULT '/uploads/default.jpg',
    role ENUM('user','admin') DEFAULT 'user',
    status ENUM('active','banned') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    parent_id INT DEFAULT 0,
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE goods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    pics VARCHAR(500) COMMENT '图片路径JSON数组，如["/uploads/1.jpg"]',
    category_id INT,
    seller_id INT NOT NULL,
    status ENUM('pending','approved','rejected','sold') DEFAULT 'pending',
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_seller (seller_id),
    INDEX idx_status (status),
    INDEX idx_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    goods_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending_pay','pending_verify','completed','cancelled') DEFAULT 'pending_pay',
    trade_code VARCHAR(6) COMMENT '6位数字交易码',
    trade_code_expire TIMESTAMP NULL COMMENT '交易码过期时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_buyer (buyer_id),
    INDEX idx_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    goods_id INT NOT NULL,
    user_id INT NOT NULL,
    content VARCHAR(500) NOT NULL,
    reply_to INT DEFAULT 0 COMMENT '回复哪条，0为顶层',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_goods (goods_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    target_id INT NOT NULL COMMENT '被评价人',
    rating INT CHECK(rating BETWEEN 1 AND 5),
    content VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sensitive_words (
    id INT PRIMARY KEY AUTO_INCREMENT,
    word VARCHAR(50) NOT NULL UNIQUE,
    level INT DEFAULT 1 COMMENT '风险等级'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    goods_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_goods (user_id, goods_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO categories (name, parent_id) VALUES
('教材书籍', 0), ('电子数码', 0), ('生活用品', 0), ('文体器材', 0),
('专业教材', 1), ('公共课教材', 1), ('考研资料', 1),
('手机', 2), ('电脑', 2), ('配件', 2),
('家具', 3), ('电器', 3), ('日用品', 3);

INSERT INTO sensitive_words (word, level) VALUES
('诈骗', 1), ('假货', 1), ('盗版', 2), ('枪支', 3), ('毒品', 3);