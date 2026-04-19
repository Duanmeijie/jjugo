# 九院易购（JJU GO）- 校园二手交易平台

> 基于 Node.js + Express + MySQL + Vue3 的校园二手交易平台

## 项目简介

九院易购是一个面向高校师生的二手商品交易平台，支持用户注册登录、商品发布浏览、在线下单、交易码核验、评价等功能，并提供管理员后台进行内容管理。

## 技术栈

### 后端
- Node.js 18+
- Express 4.x
- MySQL 8.0
- JWT 鉴权
- bcrypt 密码加密
- sharp 图片处理
- multer 文件上传

### 前端
- Vue 3
- Vite
- Element Plus
- Pinia 状态管理
- Vue Router
- Axios

## 启动方式

### 1. 启动后端

```bash
cd jju-go/server
node app.js
```

后端运行在 http://localhost:3000

### 2. 启动前端

```bash
cd jju-go/web
npm run dev
```

前端运行在 http://localhost:5173

## 账号信息

### 管理员账号
- 学号: `admin00000`
- 密码: `admin123`
- 后台地址: http://localhost:5173/admin

## 主要功能

### 用户端
- 用户注册/登录
- 商品浏览/搜索/分类筛选
- 商品详情查看
- 收藏商品
- 留言咨询
- 发布商品（需上传图片）
- 在线下单
- 模拟支付/交易码核验
- 订单评价
- 个人中心（我的发布/购买/卖出/收藏）

### 管理端
- 数据统计仪表盘
- 用户管理（禁用/启用）
- 商品管理（审核/下架）
- 订单管理
- 敏感词管理

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth/register | POST | 用户注册 |
| /api/auth/login | POST | 用户登录 |
| /api/auth/me | GET | 获取当前用户 |
| /api/goods | GET | 商品列表 |
| /api/goods | POST | 发布商品 |
| /api/goods/:id | GET | 商品详情 |
| /api/goods/categories | GET | 分类列表 |
| /api/orders | POST | 创建订单 |
| /api/orders/:id/pay | POST | 支付订单 |
| /api/orders/:id/verify | POST | 交易码核验 |
| /api/admin/stats | GET | 数据统计 |

## 数据库

数据库: `jjugo_db`

主要表:
- users - 用户
- categories - 分类
- goods - 商品
- orders - 订单
- comments - 留言
- reviews - 评价
- sensitive_words - 敏感词
- favorites - 收藏

## 项目结构

```
jju-go/
├── server/           # 后端
│   ├── config/      # 数据库配置
│   ├── middleware/ # 中间件
│   ├── routes/     # 路由
│   ├── utils/     # 工具
│   ├── uploads/   # 上传文件
│   └── sql/       # SQL脚本
└── web/            # 前端
    └── src/
        ├── views/      # 页面组件
        ├── router/    # 路由配置
        ├── stores/    # 状态管理
        ├── utils/    # 工具
        └── styles/   # 样式
```

## 测试

运行后端测试：
```bash
cd jju-go/server
node test-auth.js   # 认证测试
node test-goods.js  # 商品测试
node test-orders.js # 订单测试
node test-final.js  # 最终联调
```

## 注意事项

1. 首次启动需确保MySQL服务运行
2. 后端依赖3306端口，前端依赖5173端口
3. 生产环境需修改.env中的JWT_SECRET和数据库密码
4. 图片存储在server/uploads目录，上传时请确保目录存在