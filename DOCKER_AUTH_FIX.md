# Docker 认证问题修复指南

## 问题描述

在 Docker 环境中遇到"会话已过期"问题，用户一登录就被提示会话过期。

## 根本原因

1. **NEXTAUTH_URL 配置错误**：设置为
   `http://localhost:3000`，在 Docker 容器中 localhost 指向容器自身
2. **NEXTAUTH_SECRET 不安全**：使用了默认的不安全密钥

## 解决方案

### 方法一：使用自动修复脚本（推荐）

```bash
# 运行自动修复脚本
./scripts/fix-docker-auth.sh
```

### 方法二：手动修复

#### 1. 生成安全密钥

```bash
openssl rand -base64 32
```

复制生成的密钥备用。

#### 2. 修改 `.env.docker` 文件

找到以下配置项并修改：

```env
# 将这两个 URL 改为您实际访问应用的地址
NEXT_PUBLIC_APP_URL=http://your-server-ip:3000
NEXTAUTH_URL=http://your-server-ip:3000

# 将密钥替换为步骤1生成的安全密钥
NEXTAUTH_SECRET=your-generated-secure-secret
```

**重要提示：**

- `NEXTAUTH_URL` 和 `NEXT_PUBLIC_APP_URL` 必须保持一致
- 如果使用域名，格式为：`https://your-domain.com`
- 如果使用IP，格式为：`http://192.168.1.100:3000`

#### 3. 重启 Docker 容器

```bash
# 停止容器
docker-compose -f docker-compose.optimized.yml down

# 重新构建并启动
docker-compose -f docker-compose.optimized.yml up -d --build
```

## 验证修复

1. 使用新的访问地址打开应用
2. 尝试登录，应该不再出现"会话已过期"错误
3. 检查浏览器开发者工具的网络面板，确认没有认证相关错误

## 常见问题

### Q: 如何确定我的访问地址？

A:

- 如果在本地：`http://localhost:3000`
- 如果在局域网：`http://你的电脑IP:3000`
- 如果有域名：`https://your-domain.com`

### Q: 修改后仍然有问题怎么办？

A:

1. 确认 URL 格式正确（包含 http:// 或 https://）
2. 确认两个 URL 配置完全一致
3. 清除浏览器缓存和 Cookie
4. 检查 Docker 容器日志：`docker-compose logs app`

### Q: 如何回滚配置？

A: 脚本会自动备份原配置文件，文件名格式为 `.env.docker.backup.YYYYMMDD_HHMMSS`

## 安全提醒

- 生产环境中绝不要使用默认密钥
- 定期更换 NEXTAUTH_SECRET
- 确保 .env.docker 文件不被提交到版本控制系统
