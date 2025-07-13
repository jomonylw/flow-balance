# <img src="public/images/screenshots/icon.png" alt="Flow Balance Icon" width="48" style="vertical-align: middle;"> Flow Balance - 个人财务管理系统

[![CI](https://github.com/jomonylw/flow-balance/workflows/CI/badge.svg)](https://github.com/jomonylw/flow-balance/actions)
[![Docker Build](https://github.com/jomonylw/flow-balance/workflows/Docker%20Build%20and%20Release/badge.svg)](https://github.com/jomonylw/flow-balance/actions)

**语言:** [English](README.md) | [中文](README.zh_CN.md)

![Flow Balance](public/images/screenshots/og-image-zh.png)

基于现代 Web 技术栈的专业个人财务管理系统，正确区分**存量**（资产负债）和**流量**（收入支出）概念，为个人用户提供财务分析和管理工具。

## 🌟 在线体验

**立即体验 Flow Balance：** [https://flow-balance.vercel.app](https://flow-balance.vercel.app)

**演示账户：**

- 邮箱：`demo@flowbalance.com`
- 密码：`1234abcd`

> 💡 演示账户包含完整的示例数据，您可以直接体验所有功能特性。

## ✨ 核心特色

### 📊 专业财务理念

- **存量概念**：资产和负债账户反映特定时点的财务状况
- **流量概念**：收入和支出账户反映特定期间的现金流动
- **标准报表**：提供资产负债表和现金流量表

### 🚀 智能功能

- **智能粘贴**：Excel 风格的批量数据录入，支持复制粘贴和实时验证
- **FIRE 计算器**：财务自由路径规划和时间预测
- **循环交易**：自动生成定期交易记录
- **贷款管理**：支持等额本息、等额本金等多种还款方式

### 💱 多币种支持

- **全球货币**：支持主要国际货币和自定义货币
- **汇率管理**：手工录入或 API 自动更新汇率
- **智能转换**：所有金额自动转换为本位币显示

### 🎨 现代界面

- **响应式设计**：完美适配桌面端和移动端
- **主题切换**：明亮/暗黑主题，跟随系统自动切换
- **国际化**：中英文双语支持，实时切换

## 📸 界面预览

### 💼 仪表板概览

<p align="center">
  <img src="public/images/screenshots/dashboard-overview-light-zh.png" alt="仪表板概览" width="800"/>
</p>

### ⚡ 智能粘贴功能

<p align="center">
  <img src="public/images/screenshots/smart-paste-light-zh.png" alt="智能粘贴功能" width="800"/>
</p>

### 📊 财务报表

<p align="center">
  <img src="public/images/screenshots/financial-reports-light-zh.png" alt="财务报表" width="800"/>
</p>

### 🎯 FIRE 计算器

<p align="center">
  <img src="public/images/screenshots/fire-calculator-light-zh.png" alt="FIRE 计算器" width="800"/>
</p>

### 🌳 树状汇总及图形化显示

<p align="center">
  <img src="public/images/screenshots/tree-summary-charts-zh.png" alt="树状汇总及图形化显示" width="800"/>
</p>

## 🛠️ 技术栈

### 前端技术

- **框架**：Next.js 15.3.3 (App Router)
- **UI**：React 19 + TypeScript 5 + Tailwind CSS 4
- **图表**：ECharts 5.6.0
- **状态管理**：React Context API
- **数据验证**：Zod 3.25.67

### 后端技术

- **运行时**：Node.js 20+
- **数据库**：SQLite / PostgreSQL (动态检测)
- **ORM**：Prisma 6.9.0
- **认证**：JWT + bcryptjs
- **API**：Next.js API Routes

### 开发工具

- **包管理**：pnpm
- **代码质量**：ESLint 9 + Prettier 3.5.3
- **测试**：Jest 29.7.0 + Testing Library
- **构建**：Next.js Turbopack

## 🚀 快速部署

### Docker 部署（推荐）

Flow Balance 支持**动态数据库检测**，同一镜像可根据 `DATABASE_URL` 自动选择 SQLite 或 PostgreSQL。

#### SQLite 版本（个人使用）

```bash
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="file:/app/data/flow-balance.db" \
  -v flow-balance-data:/app/data \
  --restart unless-stopped \
  ghcr.io/jomonylw/flow-balance:latest
```

#### PostgreSQL 版本（生产环境）

```bash
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@postgres:5432/flowbalance" \
  --restart unless-stopped \
  ghcr.io/jomonylw/flow-balance:latest
```

#### Docker Compose

```yaml
version: '3.8'
services:
  flow-balance:
    image: ghcr.io/jomonylw/flow-balance:latest
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=file:/app/data/flow-balance.db
    volumes:
      - flow-balance-data:/app/data
    restart: unless-stopped

volumes:
  flow-balance-data:
```

### Vercel 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jomonylw/flow-balance)

#### 环境变量配置

在 Vercel 项目设置中，需要配置以下环境变量：

| 环境变量              | 说明                                      | 示例值                                          |
| --------------------- | ----------------------------------------- | ----------------------------------------------- |
| `DATABASE_URL`        | **必需** - PostgreSQL 数据库连接字符串    | `postgresql://user:password@host:5432/database` |
| `JWT_SECRET`          | **必需** - JWT 令牌签名密钥（随机字符串） | `your-super-secret-jwt-key-here`                |
| `NEXTAUTH_SECRET`     | **必需** - NextAuth.js 认证密钥           | `your-nextauth-secret-key`                      |
| `NEXTAUTH_URL`        | **必需** - 应用完整 URL                   | `https://your-app.vercel.app`                   |
| `NEXT_PUBLIC_APP_URL` | **必需** - 公开的应用 URL                 | `https://your-app.vercel.app`                   |

#### 配置步骤

1. **Fork 项目**：点击上方 "Deploy with Vercel" 按钮
2. **配置数据库**：推荐使用免费的
   [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)（基于 Prisma）
3. **设置环境变量**：在 Vercel 项目设置 → Environment Variables 中添加上述变量
4. **部署完成**：Vercel 会自动构建和部署应用

#### Vercel Postgres 配置

1. 在 Vercel 项目仪表板中，进入 **Storage** 选项卡
2. 点击 **Create Database** → 选择 **Postgres**
3. 创建完成后，Vercel 会自动设置 `DATABASE_URL` 环境变量
4. 其他环境变量需要手动添加到 **Environment Variables** 中

#### 数据库初始化

首次部署后，数据库会自动创建表结构和种子数据。如果需要手动初始化：

```bash
# 在本地连接到生产数据库
DATABASE_URL="your-production-database-url" pnpm db:migrate
DATABASE_URL="your-production-database-url" pnpm db:seed
```

> ⚠️ **注意**：确保数据库 URL 中包含正确的 SSL 配置，通常需要添加 `?sslmode=require` 参数。

### 本地开发

```bash
# 克隆项目
git clone https://github.com/jomonylw/flow-balance.git
cd flow-balance

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local

# 初始化数据库
pnpm db:migrate
pnpm db:seed

# 启动开发服务器
pnpm dev
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**Flow Balance** - 让个人财务管理可视化 🚀
