# 侧边栏布局重构完成报告

## 问题描述

在重构之前，应用中的侧边栏（NavigationSidebar）在每次页面切换时都会重新加载，导致：

- 滚动条位置丢失
- 分类树的展开/折叠状态重置
- 搜索框内容清空
- 用户体验不流畅

## 根本原因

原来的架构中，`AppLayout`
组件被包含在每个单独的页面文件内部。根据 Next.js 的工作原理，页面切换时旧页面的所有组件都会被卸载，新页面的组件会被重新挂载，导致侧边栏状态丢失。

## 解决方案

采用 Next.js 共享布局（Shared Layout）模式：

### 1. 创建路由组

- 创建 `src/app/(main)` 路由组
- 移动需要侧边栏的页面到此组内

### 2. 实施共享布局

- 在 `(main)` 组内创建 `layout.tsx`
- 将 `AppLayout` 逻辑移到共享布局中

### 3. 清理页面文件

- 从各个页面中移除 `AppLayout` 包装
- 保持页面内容不变

## 重构详情

### 移动的页面

以下页面已移动到 `(main)` 路由组：

- `dashboard/` → `(main)/dashboard/`
- `fire/` → `(main)/fire/`
- `transactions/` → `(main)/transactions/`
- `reports/` → `(main)/reports/`
- `settings/` → `(main)/settings/`
- `accounts/` → `(main)/accounts/`
- `categories/` → `(main)/categories/`

### 保留在外部的页面

以下页面不需要侧边栏，保留在 `(main)` 外部：

- `login/`
- `signup/`
- `forgot-password/`
- `reset-password/`
- `recovery-key-setup/`
- `setup/`
- `page.tsx` (根页面)

### 新建文件

- `src/app/(main)/layout.tsx` - 共享布局文件

### 修改的文件

所有移动到 `(main)` 组内的页面文件都已移除 `AppLayout` 包装。

## 技术实现

### 共享布局文件 (`(main)/layout.tsx`)

```typescript
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 身份验证和用户设置获取逻辑
  const user = await getCurrentUser()
  const userSettings = await prisma.userSettings.findUnique(...)

  return <AppLayoutClient user={userWithSettings}>{children}</AppLayoutClient>
}
```

### 页面文件简化

原来：

```typescript
export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardView />
    </AppLayout>
  )
}
```

现在：

```typescript
export default function DashboardPage() {
  return <DashboardView />
}
```

## 预期效果

重构完成后，侧边栏将在页面切换时保持状态：

- ✅ 滚动位置保持
- ✅ 分类树展开/折叠状态保持
- ✅ 搜索框内容保持
- ✅ 侧边栏宽度设置保持
- ✅ 视图模式（树形/账户）保持

## 验证状态

- ✅ 构建成功 (`pnpm run build`)
- ✅ 开发服务器启动成功 (`pnpm run dev`)
- ✅ 所有页面路由正常工作
- ✅ 无 TypeScript 错误
- ✅ 无编译错误

## 测试建议

1. 登录应用并访问 Dashboard
2. 在侧边栏中：
   - 调整滚动位置
   - 展开/折叠一些分类
   - 在搜索框中输入内容
   - 调整侧边栏宽度
3. 切换到其他页面（FIRE 征途、交易、报表、设置）
4. 验证侧边栏状态是否保持

重构已完成，应用现在具有流畅的导航体验！
