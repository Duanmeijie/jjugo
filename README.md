# 🎓 九院易购 - 校园二手交易平台

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js">
  <img src="https://img.shields.io/badge/Express-5.x-blue?style=for-the-badge&logo=express">
  <img src="https://img.shields.io/badge/Vue-3-green?style=for-the-badge&logo=vue.js">
  <img src="https://img.shields.io/badge/MySQL-8.0-orange?style=for-the-badge&logo=mysql">
  <img src="https://img.shields.io/badge/DeepSeek-API-blueviolet?style=for-the-badge">
</p>

---

## 📖 项目介绍

**九院易购** 是一款专为高校师生打造的校园二手交易平台，致力于构建安全、便捷、诚信的二手物品交易市场。平台集成 AI 智能客服、实时通知系统、高级搜索过滤等功能，为用户提供全方位的校园交易体验。

### ✨ 核心特性

| 功能 | 描述 |
|------|------|
| 🔐 **实名认证** | 学号、学院、班级、手机号四要素实名认证 |
| 📅 **时间段预约** | JSON 格式存储交易时间段，支持多时段选择 |
| 🔢 **核销码交易** | 6 位数字核销码，线下验证完成订单 |
| 💬 **实时留言** | 商品详情页实时评论互动 |
| 🛡️ **敏感词过滤** | 发布内容实时检测违规关键词 |
| 📱 **管理员后台** | 商品审核、用户管理、敏感词配置 |
| 🤖 **AI 小助手** | DeepSeek 驱动的智能客服，支持关键词匹配 + AI 增强回答 |
| 🔔 **通知系统** | 实时推送订单、留言、系统通知 |
| 🔍 **高级搜索** | 多条件筛选：关键词、分类、价格区间、排序方式 |
| 📊 **数据统计** | 浏览量统计、热门商品排行 |

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
- **Express 5** - Web 应用框架
- **MySQL 8.0** - 关系型数据库
- **JWT** - 用户身份认证
- **Multer** - 文件上传处理
- **Sharp** - 图片压缩处理
- **Bcrypt** - 密码加密
- **Axios** - AI 接口调用

### 🤖 AI 集成

- **DeepSeek API** - 主 AI 服务提供商
- **DeepSeek V4 Flash** - 默认模型
- **OpenCode API** - 备用 AI 服务

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

### 🔔 通知流程

```
事件触发 → 创建通知 → 推送给用户 → 用户查看/标记已读
   ↓           ↓           ↓              ↓
 订单创建   存入数据库   轮询获取      点击跳转
 新留言     类型分类     未读计数      相关页面
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
# 见下方配置说明

# 4. 初始化数据库
mysql -u root -p < sql/init.sql

# 5. 执行字段迁移
mysql -u root -p jjugo_db < sql/migrate_add_columns.sql

# 6. 创建通知表
mysql -u root -p jjugo_db < sql/migrate_notifications.sql

# 7. 导入 AI 小助手问答库（可选）
mysql -u root -p jjugo_db < sql/chatbot.sql

# 8. 启动后端服务
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

## ⚙️ 配置说明

### 环境变量 (.env)

```env
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=jjugo_db
DB_PORT=3306

# JWT 配置
JWT_SECRET=your_secret_key_2024

# 服务端口
PORT=3000

# DeepSeek AI 配置（主）
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions

# OpenCode AI 配置（备用）
OPENCODE_API_KEY=sk-your-opencode-api-key
OPENCODE_API_URL=https://opencode.ai/zen/v1/chat/completions

# 默认 AI 模型
AI_MODEL=deepseek-v4-flash
```

### 可用 AI 模型

| 模型 ID | 名称 | 提供商 | 默认 |
|---------|------|--------|------|
| `deepseek-v4-flash` | DeepSeek V4 Flash | DeepSeek | ✅ |
| `deepseek-chat` | DeepSeek Chat | DeepSeek | ❌ |
| `minimax-m2.5-free` | MiniMax M2.5 | OpenCode | ❌ |

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

### 4️⃣ 通知表迁移

```bash
mysql -u root -p jjugo_db < sql/migrate_notifications.sql
```

### 5️⃣ 导入 AI 小助手问答库（可选）

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
| 🤖 AI 智能补全 | 无法匹配时调用 DeepSeek AI 接口 |
| 💾 缓存加速 | Q&A 数据预加载到内存 |
| ⏱️ 超时保护 | AI 接口 10 秒超时保护 |
| 🔄 自动降级 | AI 服务不可用时自动使用本地回复 |
| 🎯 多模型支持 | 支持切换不同 AI 模型 |

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

## 🔔 通知系统

### 通知类型

| 类型 | 描述 | 触发场景 |
|------|------|----------|
| `order_created` | 新订单通知 | 买家下单时通知卖家 |
| `order_completed` | 交易完成通知 | 订单核验完成时通知买家 |
| `new_comment` | 新留言通知 | 商品收到新留言时通知卖家 |
| `goods_sold` | 商品售出通知 | 商品状态变更为已售 |
| `system` | 系统通知 | 系统公告、维护通知等 |

### API 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/notifications` | 获取通知列表 |
| GET | `/api/notifications/unread-count` | 获取未读通知数 |
| PUT | `/api/notifications/:id/read` | 标记单条已读 |
| PUT | `/api/notifications/read-all` | 全部标记已读 |
| DELETE | `/api/notifications/:id` | 删除通知 |

### 通知表结构

```sql
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    related_id INT DEFAULT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🔍 高级搜索功能

### 搜索参数

| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `keyword` | string | 关键词搜索（标题/描述） | `keyword=手机` |
| `category_id` | int | 分类筛选 | `category_id=1` |
| `min_price` | float | 最低价格 | `min_price=10` |
| `max_price` | float | 最高价格 | `max_price=100` |
| `sort` | string | 排序方式 | `sort=price_asc` |
| `page` | int | 页码 | `page=1` |
| `limit` | int | 每页数量 | `limit=20` |

### 排序方式

| 值 | 描述 |
|----|------|
| `new` | 最新发布（默认） |
| `price_asc` | 价格从低到高 |
| `price_desc` | 价格从高到低 |
| `hot` | 最多浏览 |

---

## 📁 项目结构

```
jjugo/
├── jju-go/
│   ├── server/                    # Node.js 后端
│   │   ├── config/
│   │   │   └── db.js             # 数据库配置
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT 认证中间件
│   │   ├── routes/                # 路由模块
│   │   │   ├── auth.js           # 登录/注册
│   │   │   ├── goods.js          # 商品 CRUD
│   │   │   ├── orders.js         # 订单管理
│   │   │   ├── comments.js       # 留言评论
│   │   │   ├── favorites.js      # 收藏功能
│   │   │   ├── reviews.js        # 评价系统
│   │   │   ├── chatbot.js        # AI 小助手
│   │   │   ├── notifications.js  # 通知系统
│   │   │   ├── admin.js          # 管理员接口
│   │   │   └── user.js           # 用户相关
│   │   ├── utils/                 # 工具函数
│   │   │   ├── upload.js         # 文件上传
│   │   │   ├── validator.js      # 数据验证
│   │   │   └── sensitiveFilter.js# 敏感词过滤
│   │   ├── sql/                   # SQL 脚本
│   │   │   ├── init.sql          # 初始化脚本
│   │   │   ├── chatbot.sql       # AI 问答库
│   │   │   ├── migrate_add_columns.sql
│   │   │   └── migrate_notifications.sql
│   │   ├── uploads/               # 上传的图片
│   │   ├── .env                   # 环境变量
│   │   ├── app.js                 # 入口文件
│   │   └── package.json
│   │
│   └── web/                       # Vue 3 前端
│       ├── src/
│       │   ├── views/             # 页面组件
│       │   │   ├── Home.vue       # 首页
│       │   │   ├── Login.vue      # 登录
│       │   │   ├── Register.vue   # 注册
│       │   │   ├── GoodsDetail.vue# 商品详情
│       │   │   ├── Publish.vue    # 发布商品
│       │   │   ├── Profile.vue    # 个人中心
│       │   │   ├── Orders.vue     # 订单管理
│       │   │   ├── Cart.vue       # 购物车
│       │   │   ├── Pay.vue        # 支付页面
│       │   │   ├── Verify.vue     # 核销页面
│       │   │   ├── Account.vue    # 账户设置
│       │   │   └── admin/         # 管理员页面
│       │   ├── components/        # 通用组件
│       │   │   ├── ChatBot.vue    # AI 小助手
│       │   │   ├── Notifications.vue # 通知中心
│       │   │   ├── GlassNavbar.vue
│       │   │   ├── GlassCard.vue
│       │   │   └── GlassButton.vue
│       │   ├── stores/            # Pinia 状态
│       │   │   └── user.js        # 用户状态
│       │   ├── utils/             # 工具函数
│       │   │   ├── request.js     # HTTP 请求
│       │   │   └── format.js      # 格式化工具
│       │   ├── router/            # 路由配置
│       │   │   └── index.js
│       │   ├── styles/            # 全局样式
│       │   │   └── global.scss
│       │   └── App.vue
│       ├── .env
│       ├── vite.config.js
│       └── package.json
│
├── README.md
└── LICENSE
```

---

## 📝 API 接口文档

### 认证相关

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | ❌ |
| POST | `/api/auth/login` | 用户登录 | ❌ |

### 商品相关

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/goods` | 获取商品列表 | ❌ |
| GET | `/api/goods/:id` | 商品详情 | ❌ |
| POST | `/api/goods` | 发布商品 | ✅ |
| GET | `/api/goods/my` | 我的商品 | ✅ |
| GET | `/api/goods/categories` | 获取分类 | ❌ |
| PUT | `/api/goods/:id` | 更新商品状态 | ✅ |
| DELETE | `/api/goods/:id` | 删除商品 | ✅ |

### 订单相关

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/orders` | 创建订单 | ✅ |
| POST | `/api/orders/:id/pay` | 支付订单 | ✅ |
| POST | `/api/orders/:id/verify` | 核销订单 | ✅ |
| POST | `/api/orders/:id/complete` | 完成订单 | ✅ |
| POST | `/api/orders/:id/cancel` | 取消订单 | ✅ |
| POST | `/api/orders/:id/review` | 评价订单 | ✅ |
| GET | `/api/orders/buyer` | 买家订单 | ✅ |
| GET | `/api/orders/seller` | 卖家订单 | ✅ |
| GET | `/api/orders/cart` | 购物车 | ✅ |
| GET | `/api/orders/:id` | 订单详情 | ✅ |
| DELETE | `/api/orders/:id` | 删除订单 | ✅ |

### 留言相关

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/goods/:id/comments` | 发表评论 | ✅ |
| GET | `/api/goods/:id/comments` | 获取评论 | ✅ |
| DELETE | `/api/comments/:id` | 删除评论 | ✅ |

### 收藏相关

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/goods/:id/favorite` | 收藏商品 | ✅ |
| DELETE | `/api/goods/:id/favorite` | 取消收藏 | ✅ |
| GET | `/api/favorites` | 我的收藏 | ✅ |

### 通知相关

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/notifications` | 获取通知列表 | ✅ |
| GET | `/api/notifications/unread-count` | 未读通知数 | ✅ |
| PUT | `/api/notifications/:id/read` | 标记已读 | ✅ |
| PUT | `/api/notifications/read-all` | 全部已读 | ✅ |
| DELETE | `/api/notifications/:id` | 删除通知 | ✅ |

### AI 小助手

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/chatbot/ask` | 发送问题 | ❌ |
| GET | `/api/chatbot/hot-questions` | 热门问题 | ❌ |
| GET | `/api/chatbot/models` | 可用模型列表 | ❌ |
| GET | `/api/chatbot/mode` | AI 状态 | ❌ |

### 管理员

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/admin/users` | 用户管理 | 🔒 |
| GET | `/api/admin/goods` | 商品审核 | 🔒 |
| GET | `/api/admin/orders` | 订单管理 | 🔒 |
| PUT | `/api/admin/goods/:id/status` | 商品审核 | 🔒 |
| GET | `/api/admin/sensitive-words` | 敏感词列表 | 🔒 |
| POST | `/api/admin/sensitive-words` | 添加敏感词 | 🔒 |
| DELETE | `/api/admin/sensitive-words/:id` | 删除敏感词 | 🔒 |

---

## 🧪 测试账号

| 角色 | 学号 | 密码 |
|------|------|------|
| 普通用户 A | `20210001` | `123456` |
| 普通用户 B | `20210002` | `123456` |
| 管理员 | `admin` | `admin123` |

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

### ❌ AI 小助手不回复

**症状**：AI 小助手返回本地回复或无响应

**排查步骤**：
1. 检查 `.env` 中的 `DEEPSEEK_API_KEY` 是否正确配置
2. 查看后端日志中的 `[ChatBot]` 相关输出
3. 确认 API 余额是否充足
4. 检查网络连接是否正常

### ❌ 通知不显示

**症状**：通知中心无新通知

**排查步骤**：
1. 确认已执行 `migrate_notifications.sql` 迁移脚本
2. 检查 `notifications` 表是否存在
3. 查看浏览器控制台是否有网络错误
4. 确认用户已登录（通知功能需要登录）

---

## 📄 License

MIT License - feel free to use this project for learning and development.

---

<p align="center">
  Made with ❤️ for Campus Trading
</p>
