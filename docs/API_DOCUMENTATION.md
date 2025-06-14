# Flow Balance - API 文档

## 📋 API 概述

Flow Balance 提供完整的 RESTful API，支持所有核心功能的后端操作。所有 API 都基于 Next.js API Routes 实现，提供类型安全和统一的响应格式。

## 🔐 认证机制

### JWT 令牌认证
- **令牌类型**：JWT (JSON Web Token)
- **存储方式**：HTTP-only Cookie
- **过期时间**：7天
- **刷新机制**：自动刷新

### 请求头要求
```http
Content-Type: application/json
Cookie: auth-token=<jwt-token>
```

## 📊 响应格式

### 成功响应
```json
{
  "success": true,
  "data": any,
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误信息",
  "details": "详细错误信息"
}
```

### HTTP 状态码
- `200` - 成功
- `201` - 创建成功
- `400` - 请求错误
- `401` - 未认证
- `403` - 无权限
- `404` - 资源不存在
- `500` - 服务器错误

## 🔑 认证相关 API

### 用户注册
```http
POST /api/auth/signup
```

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "注册成功"
}
```

### 用户登录
```http
POST /api/auth/login
```

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com"
    }
  },
  "message": "登录成功"
}
```

### 用户登出
```http
POST /api/auth/logout
```

**响应**：
```json
{
  "success": true,
  "message": "登出成功"
}
```

### 请求密码重置
```http
POST /api/auth/request-password-reset
```

**请求体**：
```json
{
  "email": "user@example.com"
}
```

### 重置密码
```http
POST /api/auth/reset-password
```

**请求体**：
```json
{
  "token": "reset_token",
  "password": "new_password",
  "confirmPassword": "new_password"
}
```

## 🏦 账户管理 API

### 获取账户列表
```http
GET /api/accounts
```

**查询参数**：
- `categoryId` (可选) - 分类ID筛选
- `type` (可选) - 账户类型筛选

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "account_id",
      "name": "账户名称",
      "description": "账户描述",
      "currencyCode": "USD",
      "color": "#3B82F6",
      "category": {
        "id": "category_id",
        "name": "分类名称",
        "type": "ASSET"
      },
      "currency": {
        "code": "USD",
        "symbol": "$",
        "name": "US Dollar"
      }
    }
  ]
}
```

### 创建账户
```http
POST /api/accounts
```

**请求体**：
```json
{
  "name": "新账户",
  "categoryId": "category_id",
  "currencyCode": "USD",
  "description": "账户描述",
  "color": "#3B82F6"
}
```

### 获取账户详情
```http
GET /api/accounts/[id]
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "account_id",
    "name": "账户名称",
    "description": "账户描述",
    "currencyCode": "USD",
    "category": {
      "id": "category_id",
      "name": "分类名称",
      "type": "ASSET"
    },
    "transactions": [
      {
        "id": "transaction_id",
        "type": "INCOME",
        "amount": 1000.00,
        "description": "交易描述",
        "date": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 更新账户
```http
PUT /api/accounts/[id]
```

**请求体**：
```json
{
  "name": "更新后的账户名",
  "description": "更新后的描述",
  "color": "#10B981"
}
```

### 删除账户
```http
DELETE /api/accounts/[id]
```

### 获取账户详细统计
```http
GET /api/accounts/[id]/details
```

**响应**：
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "account_id",
      "name": "账户名称",
      "type": "ASSET"
    },
    "balance": {
      "current": 5000.00,
      "previous": 4500.00,
      "change": 500.00,
      "changePercent": 11.11
    },
    "statistics": {
      "totalTransactions": 25,
      "totalIncome": 6000.00,
      "totalExpense": 1000.00,
      "averageTransaction": 240.00
    }
  }
}
```

### 获取账户交易列表
```http
GET /api/accounts/[id]/transactions
```

**查询参数**：
- `page` (可选) - 页码，默认1
- `limit` (可选) - 每页数量，默认10
- `type` (可选) - 交易类型筛选
- `startDate` (可选) - 开始日期
- `endDate` (可选) - 结束日期

**响应**：
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "transaction_id",
        "type": "INCOME",
        "amount": 1000.00,
        "description": "交易描述",
        "date": "2024-01-01T00:00:00.000Z",
        "tags": [
          {
            "tag": {
              "id": "tag_id",
              "name": "标签名称"
            }
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

## 💰 交易管理 API

### 获取交易列表
```http
GET /api/transactions
```

**查询参数**：
- `page` (可选) - 页码
- `limit` (可选) - 每页数量
- `accountId` (可选) - 账户ID筛选
- `categoryId` (可选) - 分类ID筛选
- `type` (可选) - 交易类型筛选
- `dateFrom` (可选) - 开始日期
- `dateTo` (可选) - 结束日期
- `search` (可选) - 搜索关键词
- `excludeBalanceAdjustment` (可选) - 是否排除余额调整记录，默认为 false

**说明**：
- 默认情况下，API返回所有类型的交易记录（包括余额调整记录）
- 通用交易页面使用 `excludeBalanceAdjustment=true` 来排除余额调整记录
- 存量账户类别页面使用默认行为来包含余额调整记录

### 创建交易
```http
POST /api/transactions
```

**请求体**：
```json
{
  "accountId": "account_id",
  "categoryId": "category_id",
  "type": "INCOME",
  "amount": 1000.00,
  "description": "交易描述",
  "notes": "备注信息",
  "date": "2024-01-01T00:00:00.000Z",
  "tagIds": ["tag_id_1", "tag_id_2"]
}
```

### 获取交易详情
```http
GET /api/transactions/[id]
```

### 更新交易
```http
PUT /api/transactions/[id]
```

### 删除交易
```http
DELETE /api/transactions/[id]
```

## ⚖️ 余额更新 API

### 更新账户余额
```http
POST /api/balance-update
```

**请求体**：
```json
{
  "accountId": "account_id",
  "newBalance": 5000.00,
  "description": "余额调整说明",
  "date": "2024-01-01T00:00:00.000Z"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "transaction_id",
      "type": "BALANCE_ADJUSTMENT",
      "amount": 500.00,
      "description": "余额调整说明"
    },
    "newBalance": 5000.00,
    "balanceChange": 500.00
  },
  "message": "余额更新成功"
}
```

## 📁 分类管理 API

### 获取分类列表
```http
GET /api/categories
```

**查询参数**：
- `type` (可选) - 账户类型筛选
- `parentId` (可选) - 父分类ID筛选

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "category_id",
      "name": "分类名称",
      "type": "ASSET",
      "parentId": null,
      "order": 1,
      "children": [
        {
          "id": "child_category_id",
          "name": "子分类名称",
          "type": "ASSET",
          "parentId": "category_id",
          "order": 1
        }
      ],
      "accounts": [
        {
          "id": "account_id",
          "name": "账户名称",
          "currencyCode": "USD"
        }
      ]
    }
  ]
}
```

### 创建分类
```http
POST /api/categories
```

**请求体**：
```json
{
  "name": "新分类",
  "type": "ASSET",
  "parentId": "parent_category_id",
  "order": 1
}
```

### 获取分类详情
```http
GET /api/categories/[id]
```

### 更新分类
```http
PUT /api/categories/[id]
```

### 删除分类
```http
DELETE /api/categories/[id]
```

### 获取分类汇总统计
```http
GET /api/categories/[id]/summary
```

**响应**：
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "category_id",
      "name": "分类名称",
      "type": "ASSET"
    },
    "summary": {
      "totalBalance": 10000.00,
      "accountCount": 3,
      "transactionCount": 50,
      "lastTransactionDate": "2024-01-01T00:00:00.000Z"
    },
    "accounts": [
      {
        "id": "account_id",
        "name": "账户名称",
        "balance": 5000.00,
        "currency": {
          "code": "USD",
          "symbol": "$"
        }
      }
    ],
    "children": [
      {
        "id": "child_category_id",
        "name": "子分类名称",
        "totalBalance": 3000.00,
        "accountCount": 2
      }
    ]
  }
}
```
