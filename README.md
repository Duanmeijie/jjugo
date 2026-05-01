# 🎓 九院易购 - 校园二手交易平台

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js">
  <img src="https://img.shields.io/badge/Express-4.x-blue?style=for-the-badge&logo=express">
  <img src="https://img.shields.io/badge/Vue-3-green?style=for-the-badge&logo=vue.js">
  <img src="https://img.shields.io/badge/MySQL-8.0-orange?style=for-the-badge&logo=mysql">
</p>

---

## 📖 项目介绍

**九院易购** 是一款专为高校师生打造的校园二手交易平台，致力于构建安全、便捷、诚信的二手物品交易市场。

### ✨ 核心特性

| 功能 | 描述 |
|------|------|
| 🔐 **实名认证** | 学号、学院、班级、手机号四要素实名认证 |
| 📅 **时间段预约** | JSON 格式存储交易时间段，支持多时段选择 |
| 🔢 **核销码交易** | 6 位数字核销码，线下验证完成订单 |
| 💬 **实时留言** | 商品详情页实时评论互动 |
| 🛡️ **敏感词过滤** | 发布内容实时检测违规关键词 |
| 📱 **管理员后台** | 商品审核、用户管理、敏感词配置 |
| 🤖 **AI 小助手** | 智能客服，支持关键词匹配 + AI 增强回答 |

---

## 🛠 技术栈

### 🖥️ 前端

- **Vue 3** - 渐进式前端框架
- **Vite** - 下一代构建工具
- **Element Plus** - Vue 3 UI 组件库
- **Pinia** - 状态管理
- **Axios** - HTTP 客户端
- **Vue Router** - 路由管理
- **SASS** - CSS 预处理器

### ⚙️ 后端

- **Node.js** - JavaScript 运行时
- **Express** - Web 应用框架
- **MySQL 8.0** - 关系型数据库
- **JWT** - 用户身份认证
- **Multer** - 文件上传处理
- **Sharp** - 图片压缩处理
- **Bcrypt** - 密码加密
- **Axios** - AI 接口调用

### 🗄️ 数据库设计亮点

```sql
-- JSON 类型字段示例
preferred_time_slots JSON    -- 期望交易时间数组
seller_student_info JSON     -- 卖家学生信息
```

---

## 📊 项目流程图解

### 📝 发布流程

```
用户填写表单 → 前端组装 JSON → 后端接收验证 → 存入 MySQL
     ↓              ↓              ↓              ↓
  标题/描述     preferred_     敏感词检查      JSON 字段
  价格/分类     time_slots    图片处理       自动存储
  时间/地点     preferred_
               location
```

### 💳 交易流程

```
买家下单 → 生成6位核销码 → 线下交易 → 输入核销码完成订单
    ↓            ↓              ↓              ↓
 创建订单    随机6位数字     当面验货        订单完成
 状态:pending  状态:sold_    确认收货        状态:sold
 _payment     pending
```

### 🤖 AI 小助手流程

```
用户发送消息 → 关键词匹配本地 Q&A → AI 模型智能回答 → 返回回复
     ↓              ↓                   ↓               ↓
  用户输入      匹配优先级最高       无法匹配时触发     50字以内
  消息内容      的 Q&A 记录          AI 接口调用      简洁回答
```

---

## 🚀 快速启动指南

### 📌 环境准备

| 软件 | 版本要求 |
|------|----------|
| Node.js | ≥ 18.0 |
| MySQL | ≥ 8.0 |
| npm | ≥ 9.0 |

### 🔧 后端启动

```bash
# 1. 进入后端目录
cd jju-go/server

# 2. 安装依赖
npm install

# 3. 配置数据库（编辑 .env 文件）
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=jjugo_db

# 4. 初始化数据库
mysql -u root -p < sql/init.sql

# 5. 执行字段迁移
mysql -u root -p jjugo_db < sql/migrate_add_columns.sql

# 6. 启动后端服务
npm start
```

### 🎨 前端启动

```bash
# 1. 进入前端目录
cd jju-go/web

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

---

## 🗄️ 数据库配置与初始化

### 1️⃣ 创建数据库

```sql
CREATE DATABASE jjugo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jjugo_db;
```

### 2️⃣ 导入初始化脚本

```bash
mysql -u root -p jjugo_db < sql/init.sql
```

### 3️⃣ 字段迁移

```bash
mysql -u root -p jjugo_db < sql/migrate_add_columns.sql
```

### 4️⃣ 导入 AI 小助手问答库（可选）

```bash
mysql -u root -p jjugo_db < sql/chatbot.sql
```

### ⚠️ 重要提示

> **MySQL 版本要求**：必须使用 **MySQL 8.0+**，因为项目使用了 `JSON` 类型字段，旧版本不支持。

---

## 🤖 AI 小助手详解

### 功能特性

| 特性 | 描述 |
|------|------|
| 📍 关键词自动回复 | 交易流程、密码重置等常见问题 |
| 🔄 Q&A 优先级匹配 | 数据库配置的优先问题 |
| 🤖 AI 智能补全 | 无法匹配时调用 AI 接口 |
| 💾 缓存加速 | Q&A 数据预加载到内存 |
| ⏱️ 超时保护 | AI 接口 8 秒超时保护 |

### 预置问答示例

| 用户输入 | 小助手回复 |
|----------|------------|
| 你好 | 您好！我是九院小助手，请问有什么可以帮您？ |
| 发布 | 点击顶部"发布"按钮即可发布商品 |
| 交易码 | 买家支付后获得6位交易码，线下交易时出示给卖家核验 |
| 退款 | 本平台为校园线下交易平台，钱款不经过平台 |

### Q&A 数据库表结构

```sql
CREATE TABLE chatbot_qa (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question VARCHAR(200) NOT NULL,    -- 问题示例
    answer TEXT NOT NULL,               -- 回答内容
    keywords VARCHAR(500),              -- 匹配关键词（逗号分隔）
    category VARCHAR(50),               -- 分类：common/trade/publish/account
    priority INT DEFAULT 0,             -- 优先级（数字越大越优先）
    created_at TIMESTAMP
);
```

---

## 📁 项目结构

```
jjugo/
├── jju-go/
│   ├── server/                    # Node.js 后端
│   │   ├── config/db.js           # 数据库配置
│   │   ├── middleware/auth.js    # JWT 认证中间件
│   │   ├── routes/                # 路由模块
│   │   │   ├── auth.js            # 登录/注册
│   │   │   ├── goods.js           # 商品 CRUD
│   │   │   ├── orders.js          # 订单管理
│   │   │   ├── comments.js        # 留言评论
│   │   │   ├── chatbot.js         # AI 小助手
│   │   │   └── admin.js           # 管理员接口
│   │   ├── utils/                 # 工具函数
│   │   ├── sql/                   # SQL 脚本
│   │   ├── uploads/               # 上传的图片
│   │   ├── app.js                 # 入口文件
│   │   └── package.json
│   │
│   └── web/                       # Vue 3 前端
│       ├── src/
│       │   ├── views/             # 页面组件
│       │   ├── components/        # 通用组件
│       │   ├── stores/            # Pinia 状态
│       │   ├── utils/             # 工具函数
│       │   └── router/            # 路由配置
│       ├── package.json
│       └── vite.config.js
│
├── README.md
└── LICENSE
```

---

## 🔧 常见问题与解决方案

### ❌ 500 错误

**症状**：前端调用 API 返回 500 错误

**排查步骤**：
1. 打开后端运行的控制台（Console）
2. 查看完整的异常堆栈信息（Stack Trace）
3. 根据错误类型修复：
   - `JSON parse error` → 检查实体类字段类型
   - `NullPointerException` → 检查必填字段是否为空
   - `DataIntegrityViolationException` → 检查数据库字段约束

### ❌ 数据不显示

**症状**：首页商品列表为空

**排查步骤**：
1. 检查浏览器开发者工具 → Network → Response
2. 确认数据库是否有数据：`SELECT * FROM goods`
3. 检查跨域配置：`server/app.js` 中的 `cors()` 配置

### ❌ 图片上传失败

**症状**：上传图片时报错

**排查步骤**：
1. 检查 `uploads` 目录是否存在且有写入权限
2. 检查 MySQL 的 `pics` 字段是否足够长（至少 500）
3. 检查文件大小是否超过 5MB 限制

---

## 📝 API 接口文档

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/goods` | 获取商品列表 |
| POST | `/api/goods` | 发布商品 |
| GET | `/api/goods/:id` | 商品详情 |
| POST | `/api/goods/:id/comments` | 发表评论 |
| POST | `/api/orders` | 创建订单 |
| POST | `/api/orders/:id/verify` | 核销订单 |
| GET | `/api/chatbot` | AI 小助手对话 |
| GET | `/api/admin/users` | 用户管理（需管理员） |

---

## 🧪 测试账号

| 角色 | 学号 | 密码 |
|------|------|------|
| 普通用户 A | `20210001` | `123456` |
| 普通用户 B | `20210002` | `123456` |
| 管理员 | `admin` | `admin123` |

---

## 📄 License

MIT License - feel free to use this project for learning and development.

---

<p align="center">
  Made with ❤️ for Campus Trading
</p>