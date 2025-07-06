# Flow Balance - 个人财务管理系统

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jomonylw/flow-balance)
[![CI](https://github.com/jomonylw/flow-balance/workflows/CI/badge.svg)](https://github.com/jomonylw/flow-balance/actions)
[![Docker Build](https://github.com/jomonylw/flow-balance/workflows/Docker%20Build%20and%20Release/badge.svg)](https://github.com/jomonylw/flow-balance/actions)

## 📖 项目简介

Flow
Balance 是一个基于现代 Web 技术栈开发的个人财务管理系统，采用企业级财务管理理念，正确区分**存量**（资产负债）和**流量**（收入支出）概念，为个人用户提供专业级的财务分析和管理工具。

### 🎯 核心理念

- **存量概念**：资产和负债账户反映特定时点的财务状况
- **流量概念**：收入和支出账户反映特定期间的现金流动
- **专业报表**：提供标准的资产负债表和现金流量表
- **多币种支持**：支持多种货币和汇率管理
- **智能分析**：基于会计学原理的财务数据分析

### ✨ 主要特性

#### 🏦 账户管理

- **分类体系**：支持树状结构的账户分类管理
- **账户类型**：自动区分资产、负债、收入、支出四种类型
- **多币种**：每个账户支持独立的货币设置
- **余额管理**：存量账户支持余额更新，流量账户记录交易流水

#### 📊 财务报表

- **资产负债表**：反映特定时点的财务状况
- **现金流量表**：分析特定期间的现金流动情况
- **智能统计**：根据账户类型自动选择合适的统计方法
- **趋势分析**：多时间段的财务数据对比分析

#### 💱 多币种支持

- **货币管理**：支持添加和管理多种货币
- **汇率设置**：用户自定义汇率管理
- **本位币转换**：统一转换为本位币进行汇总分析
- **货币标签**：直观的货币标识和颜色编码

#### 📱 用户体验

- **响应式设计**：完美适配桌面端和移动端
- **国际化**：支持中文和英文双语切换
- **主题切换**：支持明亮、暗黑和系统主题
- **实时更新**：数据变更实时同步到界面

## 🛠️ 技术栈

### 前端技术

- **框架**：Next.js 15.3.3 (App Router)
- **UI库**：React 19 + TypeScript
- **样式**：Tailwind CSS 4
- **图表**：ECharts + echarts-for-react
- **图标**：Lucide React
- **状态管理**：React Context API

### 后端技术

- **运行时**：Node.js
- **数据库**：SQLite (开发) / PostgreSQL (生产)
- **ORM**：Prisma 6.9.0
- **认证**：JWT + bcryptjs
- **API**：Next.js API Routes

### 开发工具

- **包管理器**：pnpm
- **代码规范**：ESLint + TypeScript
- **构建工具**：Next.js Turbopack
- **开发工具**：tsx (TypeScript执行器)

### 部署和运维

- **容器化**：Docker + Docker Compose
- **CI/CD**：GitHub Actions 自动化流水线
- **云部署**：Vercel 一键部署
- **监控**：健康检查 + 性能监控
- **备份**：自动化数据备份
- **多数据库**：SQLite / PostgreSQL 支持

## 🚀 快速开始

### 环境要求

- Node.js 18.0+
- pnpm 8.0+
- SQLite 3 (开发环境) / PostgreSQL 13+ (生产环境)
- Docker & Docker Compose (可选，用于容器化部署)

### 本地开发

1. **克隆项目**

```bash
git clone <repository-url>
cd persional-balance-sheet
```

2. **安装依赖**

```bash
pnpm install
```

3. **环境配置**

```bash
# 复制环境变量文件
cp .env.example .env.local

# 编辑环境变量
# DATABASE_URL="file:./prisma/dev.db"
# JWT_SECRET="your-jwt-secret"
```

4. **数据库设置**

```bash
# 生成Prisma客户端
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate

# 填充种子数据（可选）
pnpm db:seed
```

5. **启动开发服务器**

```bash
pnpm dev
```

访问 http://localhost:3000 开始使用。

### 🚀 一键部署

#### 快速启动脚本（推荐）

```bash
# 交互式快速部署
./scripts/quick-start.sh

# 或使用 Makefile
make quick-start
```

#### GitHub 部署（推荐生产环境）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jomonylw/flow-balance)

```bash
# 1. Fork 或克隆项目到您的 GitHub
# 2. 按照分步指南配置 CI/CD
# 3. 自动构建和发布 Docker 镜像
```

📚 **详细指南**: [GitHub 设置和 CI/CD 配置指南](docs/GITHUB_SETUP_GUIDE.md)

#### 使用 Makefile 命令

```bash
# 查看所有可用命令
make help

# 开发环境
make dev                # 本地开发
make docker-dev         # Docker 开发环境

# 生产部署
make docker-prod        # Docker 生产环境
make deploy:vercel      # Vercel 部署

# 监控和维护
make health            # 健康检查
make monitor           # 启动监控
make backup            # 数据备份
```

### Docker 快速部署

#### 使用 SQLite（单机部署）

```bash
# 1. 克隆项目
git clone <repository-url>
cd persional-balance-sheet

# 2. 复制环境变量文件
cp .env.docker .env

# 3. 编辑环境变量（设置 JWT_SECRET 等）
nano .env

# 4. 启动服务
docker-compose up -d

# 5. 查看日志
docker-compose logs -f app
```

#### 使用 PostgreSQL（推荐生产环境）

```bash
# 1. 克隆项目
git clone <repository-url>
cd persional-balance-sheet

# 2. 复制并编辑环境变量
cp .env.docker .env
nano .env

# 3. 修改数据库配置
# 取消注释 PostgreSQL 相关配置
# DATABASE_URL="postgresql://flowbalance:your_secure_password@postgres:5432/flowbalance?schema=public"

# 4. 启动服务（包含 PostgreSQL）
docker-compose up -d

# 5. 查看服务状态
docker-compose ps
```

### 数据库管理

```bash
# 重置数据库
pnpm db:reset

# 查看数据库
pnpm db:studio

# 切换数据库类型
node scripts/switch-database.js postgresql  # 切换到 PostgreSQL
node scripts/switch-database.js sqlite      # 切换到 SQLite
```

## 📋 项目结构

```
persional-balance-sheet/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 认证路由组
│   │   │   ├── login/         # 登录页面
│   │   │   ├── signup/        # 注册页面
│   │   │   └── forgot-password/ # 忘记密码
│   │   ├── (app)/             # 主应用路由组
│   │   │   ├── dashboard/     # 仪表板
│   │   │   ├── accounts/      # 账户管理
│   │   │   ├── categories/    # 分类管理
│   │   │   ├── transactions/  # 交易管理
│   │   │   ├── reports/       # 财务报表
│   │   │   ├── fire/          # FIRE计算器
│   │   │   └── settings/      # 用户设置
│   │   ├── api/               # API路由
│   │   │   ├── v1/           # API版本控制
│   │   │   └── middleware.ts  # API中间件
│   │   └── globals.css        # 全局样式
│   ├── components/            # React组件
│   │   ├── ui/               # 基础UI组件库
│   │   │   ├── forms/        # 表单组件
│   │   │   ├── feedback/     # 反馈组件(Toast, Modal等)
│   │   │   ├── navigation/   # 导航组件
│   │   │   ├── data-display/ # 数据展示组件
│   │   │   └── layout/       # 布局组件
│   │   ├── features/         # 功能模块组件
│   │   │   ├── auth/         # 认证功能
│   │   │   ├── dashboard/    # 仪表板功能
│   │   │   ├── accounts/     # 账户功能
│   │   │   ├── categories/   # 分类功能
│   │   │   ├── transactions/ # 交易功能
│   │   │   ├── reports/      # 报表功能
│   │   │   ├── fire/         # FIRE功能
│   │   │   └── settings/     # 设置功能
│   │   ├── charts/           # 图表组件
│   │   └── layout/           # 全局布局组件
│   ├── lib/                  # 核心库文件
│   │   ├── api/              # API相关
│   │   │   ├── client.ts     # API客户端
│   │   │   ├── types.ts      # API类型
│   │   │   └── endpoints.ts  # API端点
│   │   ├── database/         # 数据库相关
│   │   │   ├── prisma.ts     # Prisma客户端
│   │   │   ├── queries/      # 数据库查询
│   │   │   └── migrations/   # 数据迁移脚本
│   │   ├── services/         # 业务服务
│   │   │   ├── auth.ts       # 认证服务
│   │   │   ├── currency.ts   # 货币服务
│   │   │   ├── account.ts    # 账户服务
│   │   │   └── transaction.ts # 交易服务
│   │   ├── utils/            # 工具函数
│   │   │   ├── format.ts     # 格式化工具
│   │   │   ├── validation.ts # 验证工具
│   │   │   ├── date.ts       # 日期工具
│   │   │   └── currency.ts   # 货币工具
│   │   └── constants/        # 常量定义
│   │       ├── api.ts        # API常量
│   │       ├── ui.ts         # UI常量
│   │       └── business.ts   # 业务常量
│   ├── types/                # TypeScript类型定义
│   │   ├── api/              # API类型
│   │   ├── database/         # 数据库类型
│   │   ├── ui/               # UI类型
│   │   └── business/         # 业务类型
│   ├── hooks/                # 自定义Hooks
│   │   ├── api/              # API相关Hooks
│   │   ├── ui/               # UI相关Hooks
│   │   └── business/         # 业务相关Hooks
│   ├── contexts/             # React Context
│   │   ├── providers/        # Context提供者
│   │   └── types.ts          # Context类型
│   ├── styles/               # 样式文件
│   │   ├── globals.css       # 全局样式
│   │   ├── components.css    # 组件样式
│   │   └── themes/           # 主题样式
│   └── config/               # 配置文件
│       ├── database.ts       # 数据库配置
│       ├── auth.ts           # 认证配置
│       └── app.ts            # 应用配置
│   ├── lib/                  # 工具库
│   └── types/                # TypeScript类型定义
├── prisma/                   # 数据库相关
│   ├── schema.prisma         # 数据模型
│   ├── migrations/           # 数据库迁移
│   └── seed.ts              # 种子数据
├── public/                   # 静态资源
│   └── locales/             # 国际化文件
├── docs/                     # 项目文档
│   ├── DEVELOPMENT_STANDARDS.md    # 开发规范与质量保证指南
│   ├── QUICK_REFERENCE.md          # 常用命令和快速参考
│   ├── CODE_REVIEW_CHECKLIST.md    # 代码审查检查清单
│   ├── PROJECT_CONFIGURATION.md    # 项目配置详解
│   ├── CODING_STANDARDS.md         # 代码规范详细说明
│   └── API_DOCUMENTATION.md        # API 接口文档
└── scripts/                  # 工具脚本
    ├── smart-lint-fix.js           # 智能修复 lint 错误
    ├── type-check.js               # 详细类型检查
    ├── analyze-type-usage.js       # 类型使用分析
    └── fix-console-logs.js         # 修复 console 语句
```

---

# 📚 详细功能说明

## 1. 用户认证系统

### 1.1 用户注册

- **功能描述**：新用户账户创建
- **实现位置**：`/auth/signup`
- **核心特性**：
  - 邮箱唯一性验证
  - 密码强度检查
  - 密码确认验证
  - 自动跳转到初始设置

### 1.2 用户登录

- **功能描述**：用户身份验证
- **实现位置**：`/auth/login`
- **核心特性**：
  - JWT令牌认证
  - 记住登录状态
  - 自动重定向到仪表板
  - 支持初始设置跳转

### 1.3 密码重置

- **功能描述**：忘记密码恢复
- **实现位置**：`/auth/forgot-password`, `/auth/reset-password`
- **核心特性**：
  - 邮箱验证
  - 安全令牌生成
  - 令牌过期机制
  - 密码重置确认

### 1.4 会话管理

- **功能描述**：用户会话状态管理
- **技术实现**：
  - HTTP-only Cookie存储JWT
  - 自动令牌刷新
  - 安全登出
  - 会话过期处理

## 2. 初始设置系统

### 2.1 货币选择

- **功能描述**：用户可用货币配置
- **实现位置**：`/setup`
- **核心特性**：
  - 全球货币列表
  - 常用货币推荐
  - 多选货币支持
  - 货币搜索功能

### 2.2 本位币设置

- **功能描述**：主要货币选择
- **核心特性**：
  - 从可用货币中选择
  - 汇总计算基准
  - 报表显示货币
  - 后续可修改

### 2.3 设置完成

- **功能描述**：初始配置确认
- **核心特性**：
  - 设置验证
  - 默认分类创建
  - 用户引导
  - 自动跳转仪表板

## 3. 仪表板系统

### 3.1 财务概览

- **功能描述**：核心财务指标展示
- **实现位置**：`/dashboard`
- **核心指标**：
  - 净资产总额（本位币）
  - 总资产金额
  - 总负债金额
  - 本月收支情况

### 3.2 账户汇总

- **功能描述**：账户余额快速查看
- **核心特性**：
  - 按分类分组显示
  - 多币种余额汇总
  - 实时余额更新
  - 快速操作入口

### 3.3 趋势图表

- **功能描述**：财务趋势可视化
- **图表类型**：
  - **净资产趋势图**：显示资产净值变化
  - **现金流图表**：显示收支流量变化
  - **分类分布图**：显示资产/负债分布
  - **月度对比图**：显示月度财务变化

### 3.4 快速操作

- **功能描述**：常用操作快捷入口
- **操作类型**：
  - 添加交易记录
  - 更新账户余额
  - 创建新账户
  - 查看详细报表

### 3.5 数据验证

- **功能描述**：数据质量检查
- **验证项目**：
  - 账户类型设置完整性
  - 交易数据一致性
  - 汇率设置完整性
  - 分类配置合理性

## 4. 账户管理系统

### 4.1 账户分类管理

#### 4.1.1 分类树结构

- **功能描述**：层级分类组织
- **实现位置**：`/categories`
- **核心特性**：
  - 无限层级支持
  - 拖拽排序
  - 展开/折叠控制
  - 批量操作

#### 4.1.2 账户类型

- **资产类（ASSET）**：

  - 现金账户
  - 银行存款
  - 投资账户
  - 固定资产

- **负债类（LIABILITY）**：

  - 信用卡
  - 贷款
  - 应付款项

- **收入类（INCOME）**：

  - 工资收入
  - 投资收益
  - 其他收入

- **支出类（EXPENSE）**：
  - 生活费用
  - 娱乐消费
  - 交通费用

#### 4.1.3 分类操作

- **创建分类**：

  - 分类名称设置
  - 父分类选择
  - 账户类型指定
  - 排序权重设置

- **编辑分类**：
  - 名称修改
  - 类型调整
  - 层级移动
  - 删除保护

### 4.2 账户管理

#### 4.2.1 账户创建

- **功能描述**：新建账户
- **必填信息**：
  - 账户名称（用户内唯一）
  - 所属分类
  - 账户货币
  - 账户描述（可选）

#### 4.2.2 账户配置

- **货币设置**：

  - 单一货币限制
  - 货币不可变更（有交易后）
  - 支持用户可用货币

- **显示设置**：
  - 账户颜色
  - 图标选择
  - 排序权重

#### 4.2.3 账户操作

- **存量类账户**：

  - 主操作：更新余额
  - 次操作：查看交易记录
  - 特点：关注时点余额

- **流量类账户**：
  - 主操作：添加交易
  - 特点：关注期间流量

### 4.3 账户详情页面

#### 4.3.1 存量类账户详情

- **实现组件**：`StockAccountDetailView`
- **展示内容**：
  - 当前余额
  - 余额变化趋势
  - 历史余额记录
  - 余额更新操作

#### 4.3.2 流量类账户详情

- **实现组件**：`FlowAccountDetailView`
- **展示内容**：
  - 累计流量
  - 期间流量统计
  - 交易明细列表
  - 添加交易操作

#### 4.3.3 通用功能

- **交易列表**：

  - 分页显示（10条/页）
  - 筛选和搜索
  - 排序功能
  - 批量操作

- **统计图表**：
  - 余额/流量趋势图
  - 月度统计图
  - 分类分布图

## 5. 交易管理系统

### 5.1 交易类型

#### 5.1.1 基础交易类型

- **收入交易（INCOME）**：

  - 增加资产账户余额
  - 减少负债账户余额
  - 记录收入类账户流量

- **支出交易（EXPENSE）**：

  - 减少资产账户余额
  - 增加负债账户余额
  - 记录支出类账户流量

- **余额调整（BALANCE）**：
  - 仅用于存量类账户
  - 调整账户余额到准确值
  - 自动计算调整金额

#### 5.1.2 交易验证规则

- **账户类型匹配**：

  - 资产/负债账户：支持所有交易类型
  - 收入账户：仅支持收入交易
  - 支出账户：仅支持支出交易

- **货币一致性**：
  - 交易货币必须与账户货币一致
  - 不支持跨货币交易
  - 汇率转换在统计层面处理

### 5.2 交易创建

#### 5.2.1 交易表单

- **实现组件**：`TransactionFormModal`
- **必填字段**：
  - 交易金额
  - 交易类型
  - 所属账户
  - 交易日期
  - 交易描述

#### 5.2.2 高级功能

- **标签系统**：

  - 多标签支持
  - 标签颜色编码
  - 标签搜索筛选

- **备注信息**：
  - 详细交易说明
  - 附加信息记录

### 5.3 余额更新功能

#### 5.3.1 余额更新模式

- **适用账户**：仅存量类账户（资产/负债）
- **实现组件**：`BalanceUpdateModal`
- **操作方式**：
  - 直接设置新余额
  - 系统自动计算调整金额
  - 创建调整交易记录

#### 5.3.2 使用场景

- **银行对账**：根据银行账单更新余额
- **投资账户**：根据市值变化更新余额
- **信用卡账单**：根据账单更新负债余额

### 5.4 交易列表管理

#### 5.4.1 列表功能

- **分页显示**：每页10条记录
- **排序功能**：按日期、金额、类型排序
- **筛选功能**：
  - 按交易类型筛选
  - 按日期范围筛选
  - 按标签筛选
  - 按金额范围筛选

#### 5.4.2 批量操作

- **批量删除**：选择多条记录删除
- **批量编辑**：批量修改标签、分类
- **批量导出**：导出为CSV/Excel格式

## 6. 多币种系统

### 6.1 货币管理

#### 6.1.1 全球货币支持

- **预置货币**：

  - 主要国际货币（USD, EUR, GBP, JPY等）
  - 中国货币（CNY）
  - 其他常用货币

- **自定义货币**：
  - 用户创建专属货币
  - 自定义货币符号
  - 货币名称设置

#### 6.1.2 用户可用货币

- **管理机制**：

  - 用户选择可用货币列表
  - 简化界面显示
  - 避免货币混乱

- **货币状态**：
  - 启用/禁用状态
  - 显示顺序设置
  - 使用频率统计

### 6.2 汇率管理

#### 6.2.1 汇率设置

- **实现位置**：`/settings` - 汇率管理标签
- **设置方式**：
  - 手动输入汇率
  - 设置生效日期
  - 添加备注说明

#### 6.2.2 汇率应用

- **转换方向**：主要设置其他货币到本位币的汇率
- **应用范围**：
  - 仪表板汇总统计
  - 财务报表生成
  - 跨货币对比分析

#### 6.2.3 汇率提醒

- **缺失检测**：自动检测缺失的汇率设置
- **Dashboard提醒**：在仪表板显示设置提醒
- **引导设置**：一键跳转到汇率设置页面

### 6.3 货币转换

#### 6.3.1 转换逻辑

- **实现服务**：`src/lib/currency-conversion.ts`
- **转换方式**：
  - 单个金额转换
  - 批量金额转换
  - 实时汇率应用

#### 6.3.2 显示策略

- **原始金额**：显示交易原始货币和金额
- **转换金额**：显示本位币等值金额
- **汇率信息**：透明显示使用的汇率

## 7. 财务报表系统

### 7.1 资产负债表

#### 7.1.1 报表结构

- **实现位置**：`/reports` - 资产负债表
- **报表内容**：
  - **资产部分**：
    - 流动资产
    - 非流动资产
    - 资产小计
  - **负债部分**：
    - 流动负债
    - 非流动负债
    - 负债小计
  - **净资产**：资产总额 - 负债总额

#### 7.1.2 数据特点

- **时点数据**：反映特定时点的财务状况
- **余额导向**：关注账户当前余额
- **分类汇总**：按分类层级汇总显示

### 7.2 现金流量表

#### 7.2.1 报表结构

- **实现位置**：`/reports` - 现金流量表
- **报表内容**：
  - **经营活动现金流**：
    - 收入项目
    - 支出项目
    - 经营活动净现金流
  - **投资活动现金流**：
    - 投资收益
    - 投资支出
    - 投资活动净现金流
  - **筹资活动现金流**：
    - 借款收入
    - 还款支出
    - 筹资活动净现金流

#### 7.2.2 数据特点

- **期间数据**：反映特定期间的现金流动
- **流量导向**：关注交易流水汇总
- **活动分类**：按现金流活动性质分类

### 7.3 报表功能

#### 7.3.1 时间范围选择

- **预设范围**：
  - 本月
  - 本季度
  - 本年度
  - 自定义范围

#### 7.3.2 货币显示

- **本位币显示**：统一转换为本位币显示
- **原币种参考**：提供原始货币金额参考
- **汇率说明**：显示使用的汇率信息

#### 7.3.3 导出功能

- **PDF导出**：生成专业格式的PDF报表
- **Excel导出**：导出可编辑的Excel格式
- **打印功能**：支持浏览器打印

## 8. 用户设置系统

### 8.1 个人信息设置

#### 8.1.1 基本信息

- **实现位置**：`/settings` - 个人信息标签
- **可设置项**：
  - 用户邮箱（登录账号）
  - 密码修改
  - 账户安全设置

#### 8.1.2 安全设置

- **密码管理**：
  - 当前密码验证
  - 新密码设置
  - 密码强度检查

### 8.2 系统偏好设置

#### 8.2.1 显示设置

- **主题选择**：

  - 明亮主题
  - 暗黑主题
  - 跟随系统

- **语言设置**：
  - 中文（简体）
  - English
  - 实时切换

#### 8.2.2 货币设置

- **本位币设置**：

  - 从可用货币中选择
  - 影响汇总计算
  - 影响报表显示

- **可用货币管理**：
  - 添加/移除货币
  - 货币排序
  - 启用/禁用状态

### 8.3 分类设置

#### 8.3.1 分类管理

- **实现位置**：`/settings` - 分类设置标签
- **管理功能**：
  - 创建新分类
  - 编辑分类信息
  - 删除分类（带保护）
  - 分类排序

#### 8.3.2 分类类型设置

- **类型指定**：

  - 资产类分类
  - 负债类分类
  - 收入类分类
  - 支出类分类

- **类型影响**：
  - 影响余额计算逻辑
  - 影响统计方式
  - 影响报表分类

### 8.4 汇率设置

#### 8.4.1 汇率管理

- **实现位置**：`/settings` - 汇率管理标签
- **管理功能**：
  - 查看现有汇率
  - 添加新汇率
  - 编辑汇率值
  - 删除过期汇率

#### 8.4.2 汇率设置向导

- **缺失检测**：自动检测需要设置的汇率
- **批量设置**：一次性设置多个汇率
- **汇率验证**：检查汇率合理性

## 9. 用户界面设计

### 9.1 设计原则

#### 9.1.1 响应式设计

- **桌面端优化**：

  - 宽屏布局
  - 多列显示
  - 丰富的交互

- **移动端适配**：
  - 单列布局
  - 触摸友好
  - 简化操作

#### 9.1.2 视觉层次

- **颜色系统**：

  - 资产类：蓝色主题
  - 负债类：橙色主题
  - 收入类：绿色主题
  - 支出类：红色主题

- **图标系统**：
  - Lucide React图标库
  - 语义化图标选择
  - 一致的图标风格

### 9.2 布局结构

#### 9.2.1 主布局

- **顶部导航**：

  - 应用标题
  - 用户菜单
  - 快速设置

- **侧边栏**：

  - 主导航菜单
  - 账户分类树
  - 快速统计

- **主内容区**：
  - 页面内容
  - 数据展示
  - 操作界面

#### 9.2.2 导航系统

- **主导航**：

  - 仪表板
  - 账户管理
  - 分类管理
  - 财务报表
  - 用户设置

- **面包屑导航**：
  - 当前位置指示
  - 快速返回上级
  - 路径清晰展示

### 9.3 交互设计

#### 9.3.1 表单设计

- **表单验证**：

  - 实时验证
  - 错误提示
  - 成功反馈

- **用户引导**：
  - 占位符文本
  - 帮助提示
  - 操作说明

#### 9.3.2 反馈系统

- **Toast通知**：

  - 操作成功提示
  - 错误信息显示
  - 警告信息提醒

- **加载状态**：
  - 骨架屏加载
  - 进度指示器
  - 加载动画

### 9.4 数据可视化

#### 9.4.1 图表设计

- **ECharts集成**：

  - 专业图表库
  - 丰富的图表类型
  - 交互式图表

- **图表类型**：
  - 折线图：趋势展示
  - 柱状图：对比分析
  - 饼图：分布展示
  - 面积图：累积展示

#### 9.4.2 数据展示

- **千位分隔符**：

  - 金额显示格式化
  - 提高可读性
  - 统一格式标准

- **货币符号**：
  - 货币标识显示
  - 颜色编码
  - 直观识别

## 10. 国际化与主题

### 10.1 国际化支持

#### 10.1.1 多语言系统

- **支持语言**：

  - 中文（简体）- 默认语言
  - English - 英文支持

- **实现方式**：
  - React Context管理
  - JSON翻译文件
  - 动态语言切换

#### 10.1.2 翻译覆盖

- **界面翻译**：

  - 所有UI文本
  - 按钮和标签
  - 提示信息

- **数据翻译**：
  - 错误信息
  - 成功提示
  - 帮助文档

### 10.2 主题系统

#### 10.2.1 主题选项

- **明亮主题**：

  - 白色背景
  - 深色文字
  - 清晰对比

- **暗黑主题**：

  - 深色背景
  - 浅色文字
  - 护眼设计

- **系统主题**：
  - 跟随系统设置
  - 自动切换
  - 用户友好

#### 10.2.2 主题实现

- **CSS变量**：

  - 动态颜色值
  - 主题切换
  - 一致性保证

- **Tailwind CSS**：
  - 原子化CSS
  - 主题变量支持
  - 响应式设计

---

# 🏗️ 技术架构

## 1. 系统架构

### 1.1 整体架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (React)   │    │  后端 (Next.js)  │    │  数据库 (SQLite) │
│                 │    │                 │    │                 │
│ • 用户界面      │◄──►│ • API Routes    │◄──►│ • Prisma ORM    │
│ • 状态管理      │    │ • 业务逻辑      │    │ • 数据模型      │
│ • 路由管理      │    │ • 认证授权      │    │ • 数据持久化    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.2 技术选型理由

#### 1.2.1 Next.js App Router

- **优势**：
  - 服务端渲染（SSR）
  - 静态生成（SSG）
  - API Routes集成
  - 文件系统路由

#### 1.2.2 Prisma ORM

- **优势**：
  - 类型安全
  - 数据库迁移
  - 查询构建器
  - 开发体验优秀

#### 1.2.3 SQLite/PostgreSQL

- **SQLite**（开发环境）：

  - 零配置
  - 文件数据库
  - 快速开发

- **PostgreSQL**（生产环境）：
  - 企业级数据库
  - 高并发支持
  - 丰富的数据类型

## 2. 数据模型设计

### 2.1 核心实体关系

```mermaid
erDiagram
    User ||--o{ Account : owns
    User ||--o{ Category : creates
    User ||--o{ Transaction : records
    User ||--|| UserSettings : has
    User ||--o{ UserCurrency : configures
    User ||--o{ ExchangeRate : sets

    Category ||--o{ Account : contains
    Category ||--o{ Category : parent-child

    Account ||--o{ Transaction : has
    Account }|--|| Currency : uses

    Transaction }|--|| Currency : denominated-in
    Transaction ||--o{ TransactionTag : tagged-with

    Currency ||--o{ ExchangeRate : from-currency
    Currency ||--o{ ExchangeRate : to-currency
```

### 2.2 关键数据模型

#### 2.2.1 用户模型 (User)

```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  password         String    // 哈希后的密码
  resetToken       String?   // 密码重置令牌
  resetTokenExpiry DateTime? // 重置令牌过期时间
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // 关联关系
  settings         UserSettings?
  userCurrencies   UserCurrency[]
  accounts         Account[]
  categories       Category[]
  transactions     Transaction[]
  exchangeRates    ExchangeRate[]
}
```

#### 2.2.2 账户类型枚举

```prisma
enum AccountType {
  ASSET     // 资产类（存量）
  LIABILITY // 负债类（存量）
  INCOME    // 收入类（流量）
  EXPENSE   // 支出类（流量）
}
```

#### 2.2.3 交易类型枚举

```prisma
enum TransactionType {
  INCOME             // 收入
  EXPENSE            // 支出
  BALANCE            // 余额调整
}
```

### 2.3 数据完整性约束

#### 2.3.1 唯一性约束

- 用户邮箱唯一性
- 用户内账户名唯一性
- 用户内分类名唯一性（同级）
- 汇率设置唯一性（用户+货币对+日期）

#### 2.3.2 外键约束

- 级联删除：用户删除时删除所有关联数据
- 引用完整性：确保外键引用存在
- 约束检查：业务规则验证

## 3. API 设计

### 3.1 API 架构

#### 3.1.1 RESTful 设计

- **资源导向**：以资源为中心的URL设计
- **HTTP方法**：GET、POST、PUT、DELETE
- **状态码**：标准HTTP状态码
- **响应格式**：统一JSON格式

#### 3.1.2 API 响应格式

```typescript
// 成功响应
{
  success: true,
  data: any,
  message?: string
}

// 错误响应
{
  success: false,
  error: string,
  details?: any
}
```

### 3.2 核心 API 端点

#### 3.2.1 认证相关

```
POST /api/auth/signup          # 用户注册
POST /api/auth/login           # 用户登录
POST /api/auth/logout          # 用户登出
POST /api/auth/request-password-reset  # 请求密码重置
POST /api/auth/reset-password  # 重置密码
```

#### 3.2.2 账户管理

```
GET    /api/accounts           # 获取账户列表
POST   /api/accounts           # 创建新账户
GET    /api/accounts/[id]      # 获取账户详情
PUT    /api/accounts/[id]      # 更新账户信息
DELETE /api/accounts/[id]      # 删除账户
GET    /api/accounts/[id]/details      # 获取账户详细统计
GET    /api/accounts/[id]/transactions # 获取账户交易列表
```

#### 3.2.3 交易管理

```
GET    /api/transactions       # 获取交易列表
POST   /api/transactions       # 创建新交易
GET    /api/transactions/[id]  # 获取交易详情
PUT    /api/transactions/[id]  # 更新交易信息
DELETE /api/transactions/[id]  # 删除交易
```

#### 3.2.4 余额更新

```
POST   /api/balance-update     # 更新账户余额
```

#### 3.2.5 分类管理

```
GET    /api/categories         # 获取分类列表
POST   /api/categories         # 创建新分类
GET    /api/categories/[id]    # 获取分类详情
PUT    /api/categories/[id]    # 更新分类信息
DELETE /api/categories/[id]    # 删除分类
GET    /api/categories/[id]/summary # 获取分类汇总统计
```

#### 3.2.6 货币和汇率

```
GET    /api/currencies         # 获取货币列表
GET    /api/user-currencies    # 获取用户可用货币
POST   /api/user-currencies    # 设置用户可用货币
GET    /api/exchange-rates     # 获取汇率列表
POST   /api/exchange-rates     # 创建/更新汇率
GET    /api/exchange-rates/missing # 检查缺失汇率
```

#### 3.2.7 报表和统计

```
GET    /api/dashboard/summary  # 仪表板汇总数据
GET    /api/dashboard/charts   # 仪表板图表数据
GET    /api/reports/balance-sheet # 资产负债表
GET    /api/reports/personal-cash-flow # 个人现金流量表
```

#### 3.2.8 用户设置

```
GET    /api/user/settings      # 获取用户设置
PUT    /api/user/settings      # 更新用户设置
PUT    /api/user/password      # 修改密码
```

### 3.3 API 安全

#### 3.3.1 认证机制

- **JWT令牌**：无状态认证
- **HTTP-only Cookie**：安全存储
- **令牌过期**：自动过期机制
- **刷新机制**：令牌自动刷新

#### 3.3.2 授权控制

- **用户隔离**：数据按用户隔离
- **权限检查**：操作权限验证
- **资源保护**：防止越权访问

#### 3.3.3 数据验证

- **输入验证**：所有输入数据验证
- **类型检查**：TypeScript类型安全
- **业务规则**：业务逻辑验证
- **SQL注入防护**：Prisma ORM保护

## 4. 性能优化

### 4.1 前端优化

#### 4.1.1 代码分割

- **路由分割**：按页面分割代码
- **组件懒加载**：动态导入组件
- **第三方库分割**：独立打包第三方库

#### 4.1.2 缓存策略

- **浏览器缓存**：静态资源缓存
- **API缓存**：接口数据缓存
- **状态缓存**：组件状态缓存

#### 4.1.3 渲染优化

- **服务端渲染**：首屏快速加载
- **静态生成**：预生成静态页面
- **增量静态再生**：动态更新静态页面

### 4.2 后端优化

#### 4.2.1 数据库优化

- **索引优化**：关键字段索引
- **查询优化**：高效查询语句
- **连接池**：数据库连接复用

#### 4.2.2 API优化

- **批量操作**：减少API调用次数
- **数据聚合**：服务端数据聚合
- **分页查询**：大数据集分页处理

### 4.3 用户体验优化

#### 4.3.1 加载体验

- **骨架屏**：加载状态展示
- **进度指示**：操作进度反馈
- **错误处理**：友好错误提示

#### 4.3.2 交互体验

- **实时更新**：数据实时同步
- **乐观更新**：界面即时响应
- **离线支持**：基础离线功能

---

# 🚀 部署与维护

## 1. 现代化部署指南

### 1.1 Docker 部署（推荐）

#### 1.1.1 快速开始

```bash
# 使用预构建镜像
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="file:./data/production.db" \
  -e JWT_SECRET="your-secure-jwt-secret" \
  -v flow-balance-data:/app/data \
  ghcr.io/jomonylw/flow-balance:latest
```

#### 1.1.2 Docker Compose 部署

**SQLite 版本（单机部署）**

```bash
# 1. 下载配置文件
wget https://raw.githubusercontent.com/your-repo/flow-balance/main/docker-compose.yml
wget https://raw.githubusercontent.com/your-repo/flow-balance/main/.env.docker

# 2. 配置环境变量
cp .env.docker .env
nano .env  # 修改 JWT_SECRET 等敏感信息

# 3. 启动服务
docker-compose up -d

# 4. 查看状态
docker-compose ps
docker-compose logs -f app
```

**PostgreSQL 版本（生产环境推荐）**

```bash
# 1. 下载配置文件
wget https://raw.githubusercontent.com/your-repo/flow-balance/main/docker-compose.yml
wget https://raw.githubusercontent.com/your-repo/flow-balance/main/.env.docker

# 2. 配置环境变量
cp .env.docker .env
nano .env

# 修改以下配置：
# DATABASE_URL="postgresql://flowbalance:your_secure_password@postgres:5432/flowbalance?schema=public"
# POSTGRES_PASSWORD="your_very_secure_password"
# JWT_SECRET="your-production-jwt-secret-minimum-32-characters"

# 3. 启动服务
docker-compose up -d

# 4. 检查服务
docker-compose ps
docker-compose logs postgres
docker-compose logs app
```

#### 1.1.3 自定义构建

```bash
# 1. 克隆项目
git clone <repository-url>
cd persional-balance-sheet

# 2. 构建镜像
docker build -t flow-balance .

# 3. 运行容器
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="file:./data/production.db" \
  -e JWT_SECRET="your-secure-jwt-secret" \
  -v $(pwd)/data:/app/data \
  flow-balance
```

### 1.2 Vercel 部署

#### 1.2.1 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jomonylw/flow-balance)

#### 1.2.2 手动部署

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署项目
vercel

# 4. 配置环境变量
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add NEXTAUTH_SECRET

# 5. 重新部署
vercel --prod
```

#### 1.2.3 环境变量配置

在 Vercel 控制台中设置以下环境变量：

```bash
# 必需变量
DATABASE_URL="postgresql://username:password@your-postgres-url/flowbalance?sslmode=require"
JWT_SECRET="your-production-jwt-secret-very-long-and-secure"
NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"

# 可选变量
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

### 1.3 传统服务器部署

#### 1.3.1 环境准备

```bash
# 1. 服务器要求
- Node.js 18.0+
- PostgreSQL 13+
- 内存: 2GB+
- 存储: 10GB+

# 2. 环境变量配置
DATABASE_URL="postgresql://user:password@localhost:5432/flowbalance"
JWT_SECRET="your-production-jwt-secret"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret"
```

#### 1.3.2 部署步骤

```bash
# 1. 克隆代码
git clone <repository-url>
cd persional-balance-sheet

# 2. 安装依赖
pnpm install --production

# 3. 数据库设置
pnpm db:generate
pnpm db:migrate

# 4. 构建应用
pnpm build

# 5. 启动服务
pnpm start
```

### 1.2 Docker 部署

#### 1.2.1 Dockerfile

```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install -g pnpm

FROM base AS deps
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm build

FROM base AS runner
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

#### 1.2.2 Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/flowbalance
      - JWT_SECRET=your-jwt-secret
    depends_on:
      - db

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=flowbalance
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 1.3 云平台部署

#### 1.3.1 Vercel 部署

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署项目
vercel --prod

# 4. 配置环境变量
vercel env add DATABASE_URL
vercel env add JWT_SECRET
```

#### 1.3.2 Railway 部署

```bash
# 1. 安装 Railway CLI
npm install -g @railway/cli

# 2. 登录 Railway
railway login

# 3. 初始化项目
railway init

# 4. 部署
railway up
```

## 2. CI/CD 自动化部署

### 2.1 GitHub Actions

项目已配置完整的 CI/CD 流水线，支持自动测试、构建和发布。

#### 2.1.1 自动化流程

```yaml
# .github/workflows/docker-build.yml
name: Docker Build and Release

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main, develop]

jobs:
  quality-check:    # 代码质量检查
  docker-build:     # Docker 镜像构建
  security-scan:    # 安全扫描
  release:          # 自动发布
```

#### 2.1.2 触发条件

- **推送到 main/develop 分支**：触发构建和测试
- **创建 Pull Request**：触发代码检查
- **创建 Tag (v*)**：触发正式发布

#### 2.1.3 发布流程

```bash
# 1. 创建版本标签
git tag v1.0.0
git push origin v1.0.0

# 2. 自动触发以下流程：
# - 代码质量检查（ESLint, TypeScript, Tests）
# - Docker 镜像构建（多架构支持）
# - 安全漏洞扫描
# - GitHub Release 创建
# - 镜像推送到 GitHub Container Registry
```

#### 2.1.4 使用发布的镜像

```bash
# 拉取最新镜像
docker pull ghcr.io/jomonylw/flow-balance:latest

# 拉取特定版本
docker pull ghcr.io/jomonylw/flow-balance:v1.0.0

# 运行容器
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="file:./data/production.db" \
  -e JWT_SECRET="your-secure-jwt-secret" \
  ghcr.io/jomonylw/flow-balance:latest
```

### 2.2 自动化测试

#### 2.2.1 测试类型

- **单元测试**：组件和函数测试
- **集成测试**：API 端点测试
- **类型检查**：TypeScript 类型验证
- **代码规范**：ESLint 和 Prettier 检查

#### 2.2.2 本地测试

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 运行类型检查
pnpm type-check

# 运行代码规范检查
pnpm lint
```

### 2.3 环境管理

#### 2.3.1 多环境配置

```bash
# 开发环境
NODE_ENV=development
DATABASE_URL="file:./prisma/dev.db"

# 测试环境
NODE_ENV=test
DATABASE_URL="file:./test.db"

# 生产环境
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db"
```

#### 2.3.2 密钥管理

```bash
# GitHub Secrets 配置
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password
DATABASE_URL=your-production-database-url
JWT_SECRET=your-production-jwt-secret
```

## 3. 数据库管理

### 2.1 数据库迁移

#### 2.1.1 开发环境迁移

```bash
# 创建新迁移
npx prisma migrate dev --name migration_name

# 重置数据库
npx prisma migrate reset

# 查看迁移状态
npx prisma migrate status
```

#### 2.1.2 生产环境迁移

```bash
# 部署迁移
npx prisma migrate deploy

# 生成客户端
npx prisma generate
```

### 2.2 数据备份

#### 2.2.1 PostgreSQL 备份

```bash
# 备份数据库
pg_dump -h localhost -U username -d flowbalance > backup.sql

# 恢复数据库
psql -h localhost -U username -d flowbalance < backup.sql
```

#### 2.2.2 自动备份脚本

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="flowbalance"

pg_dump -h localhost -U postgres $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# 保留最近7天的备份
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

### 2.3 数据监控

#### 2.3.1 性能监控

- 查询性能分析
- 慢查询日志
- 连接数监控
- 存储空间监控

#### 2.3.2 数据完整性检查

```sql
-- 检查数据一致性
SELECT
  COUNT(*) as total_accounts,
  COUNT(DISTINCT userId) as unique_users
FROM Account;

-- 检查余额计算
SELECT
  a.id,
  a.name,
  SUM(t.amount) as calculated_balance
FROM Account a
LEFT JOIN Transaction t ON a.id = t.accountId
GROUP BY a.id, a.name;
```

## 3. 监控与日志

### 3.1 应用监控

#### 3.1.1 健康检查

```typescript
// /api/health
export async function GET() {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        error: error.message,
      },
      { status: 500 }
    )
  }
}
```

#### 3.1.2 性能指标

- 响应时间监控
- 错误率统计
- 用户活跃度
- 资源使用率

### 3.2 日志管理

#### 3.2.1 日志级别

```typescript
// 日志配置
const logger = {
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error)
  },
  warn: (message: string) => {
    console.warn(`[WARN] ${message}`)
  },
  info: (message: string) => {
    console.info(`[INFO] ${message}`)
  },
  debug: (message: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`)
    }
  },
}
```

#### 3.2.2 日志收集

- 应用日志收集
- 错误日志追踪
- 用户行为日志
- 性能日志分析

## 4. 安全维护

### 4.1 安全更新

#### 4.1.1 依赖更新

```bash
# 检查安全漏洞
npm audit

# 修复安全漏洞
npm audit fix

# 更新依赖
pnpm update
```

#### 4.1.2 安全配置

```typescript
// 安全头配置
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
}
```

### 4.2 数据安全

#### 4.2.1 数据加密

- 密码哈希存储
- 敏感数据加密
- 传输层加密（HTTPS）
- 数据库连接加密

#### 4.2.2 访问控制

- 用户认证验证
- 权限边界检查
- API访问限制
- 数据访问审计

## 5. 开发指南

### 5.1 开发环境设置

#### 5.1.1 IDE 配置

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

#### 5.1.2 Git 工作流

```bash
# 功能开发流程
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 创建 Pull Request
# 代码审查
# 合并到主分支
```

### 5.2 代码规范

#### 5.2.1 命名规范

- **文件命名**：kebab-case（短横线分隔）
- **组件命名**：PascalCase（帕斯卡命名）
- **函数命名**：camelCase（驼峰命名）
- **常量命名**：UPPER_SNAKE_CASE（大写下划线）

#### 5.2.2 代码组织

```
src/
├── components/
│   ├── ui/           # 基础UI组件
│   ├── forms/        # 表单组件
│   └── charts/       # 图表组件
├── lib/
│   ├── utils.ts      # 工具函数
│   ├── validations.ts # 验证函数
│   └── constants.ts  # 常量定义
└── types/
    ├── api.ts        # API类型
    ├── database.ts   # 数据库类型
    └── ui.ts         # UI类型
```

### 5.3 测试策略

#### 5.3.1 测试类型

- **单元测试**：组件和函数测试
- **集成测试**：API接口测试
- **端到端测试**：用户流程测试
- **性能测试**：负载和压力测试

#### 5.3.2 测试工具

```bash
# 安装测试依赖
pnpm add -D jest @testing-library/react @testing-library/jest-dom

# 运行测试
pnpm test

# 测试覆盖率
pnpm test:coverage
```

## 6. 故障排除

### 6.1 常见问题

#### 6.1.1 数据库连接问题

```bash
# 检查数据库连接
npx prisma db pull

# 重新生成客户端
npx prisma generate

# 检查迁移状态
npx prisma migrate status
```

#### 6.1.2 构建问题

```bash
# 清理缓存
rm -rf .next
rm -rf node_modules
pnpm install

# 重新构建
pnpm build
```

### 6.2 性能问题

#### 6.2.1 查询优化

- 添加数据库索引
- 优化查询语句
- 使用查询缓存
- 减少N+1查询

#### 6.2.2 前端优化

- 代码分割
- 图片优化
- 缓存策略
- 懒加载实现

---

# 📞 支持与贡献

## 技术支持

- 📧 邮箱：support@flowbalance.com
- 📖 文档：查看 `/docs` 目录
- 🐛 问题反馈：GitHub Issues

## 📋 开发规范与质量保证

### 🔧 代码质量工具

项目配置了完整的代码质量保证体系：

- **ESLint**: 代码规范检查，严格的 TypeScript 规则
- **Prettier**: 统一的代码格式化
- **TypeScript**: 严格模式类型检查
- **Jest**: 单元测试框架，覆盖率要求 70%
- **Husky + lint-staged**: Git hooks 自动化检查

### 🚀 开发工作流

```bash
# 开发前检查
pnpm install                 # 安装依赖
pnpm db:generate            # 生成数据库客户端
pnpm db:migrate             # 运行数据库迁移

# 开发中检查
pnpm lint                   # ESLint 检查
pnpm type-check            # TypeScript 类型检查
pnpm test                  # 运行测试
pnpm format:check          # 格式检查

# 自动修复
pnpm lint:fix              # 自动修复 ESLint 错误
pnpm format                # 自动格式化代码

# 高级工具
node scripts/smart-lint-fix.js     # 智能批量修复
pnpm type-check:detailed           # 详细类型检查报告
```

### 📝 代码规范要点

- **组件命名**: PascalCase (如 `UserProfile.tsx`)
- **文件命名**: kebab-case (如 `format-currency.ts`)
- **Hook 命名**: camelCase，以 `use` 开头
- **类型安全**: 避免使用 `any`，充分利用 TypeScript
- **测试覆盖**: 新功能必须有对应测试
- **注释规范**: 复杂逻辑添加 JSDoc 注释

### 📚 详细文档

- **[开发规范指南](docs/DEVELOPMENT_STANDARDS.md)**: 完整的开发规范和最佳实践
- **[快速参考](docs/QUICK_REFERENCE.md)**: 常用命令和操作速查
- **[代码审查清单](docs/CODE_REVIEW_CHECKLIST.md)**: 代码审查要点
- **[项目配置详解](docs/PROJECT_CONFIGURATION.md)**: 所有配置文件说明

## 贡献指南

### 提交流程

1. **Fork 项目** 并创建功能分支
2. **遵循规范** 按照开发规范编写代码
3. **运行检查** 确保通过所有质量检查
4. **编写测试** 为新功能添加测试
5. **提交代码** 使用清晰的提交信息
6. **创建 PR** 并等待代码审查

### 提交前检查清单

- [ ] 代码通过 ESLint 检查 (`pnpm lint`)
- [ ] 代码通过 TypeScript 类型检查 (`pnpm type-check`)
- [ ] 所有测试通过 (`pnpm test`)
- [ ] 代码格式化正确 (`pnpm format:check`)
- [ ] 新功能有对应测试
- [ ] 相关文档已更新

### 代码审查要点

- 功能正确性和边界条件处理
- TypeScript 类型安全
- React 组件设计和性能优化
- 业务逻辑准确性（特别是财务计算）
- 测试覆盖率和质量
- 代码可读性和维护性

## 📚 文档导航

### 🚀 快速开始
- **[README.md](README.md)** - 项目介绍和基础使用指南
- **[快速参考](docs/QUICK_REFERENCE.md)** - 常用命令和操作速查表

### 🐳 部署指南
- **[GitHub 设置指南](docs/GITHUB_SETUP_GUIDE.md)** - 从零开始的 GitHub 仓库设置
- **[分步部署指南](docs/STEP_BY_STEP_DEPLOYMENT.md)** - 详细的实操部署流程
- **[完整部署指南](docs/DEPLOYMENT_GUIDE.md)** - 全面的部署文档
- **[部署总结](DEPLOYMENT_SUMMARY.md)** - 部署方式对比和总结

### ⚙️ CI/CD 和自动化
- **[CI/CD 配置指南](docs/CICD_CONFIGURATION.md)** - GitHub Actions 流水线详解
- **[项目状态](PROJECT_STATUS.md)** - 功能完成情况和项目亮点

### 🔧 开发文档
- **[开发规范](CODE_GUIDE_DOC/DEVELOPMENT_STANDARDS.md)** - 代码规范和最佳实践
- **[API 文档](docs/API_DOCUMENTATION.md)** - API 接口说明
- **[数据库设计](docs/DATABASE_DESIGN.md)** - 数据库结构和设计

### 🛠️ 实用工具
- **脚本工具**:
  - `scripts/quick-start.sh` - 交互式快速部署
  - `scripts/monitor.sh` - 应用监控和健康检查
  - `scripts/backup-data.js` - 数据备份工具
  - `scripts/release.sh` - 自动化版本发布
- **Makefile** - 简化的命令集合 (`make help` 查看所有命令)

## 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。

---

**Flow Balance** - 专业的个人财务管理系统 _让财务管理更简单、更专业、更智能_
