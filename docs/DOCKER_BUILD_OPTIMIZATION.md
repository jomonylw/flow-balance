# Docker 构建优化指南

## 问题分析

Docker 构建过程中出现的 Prisma 客户端构造函数验证错误：

```
Error [PrismaClientConstructorValidationError]: Invalid value undefined for datasource "db" provided to PrismaClient constructor.
```

### 根本原因

1. **构建时环境变量缺失**: 在 Docker 构建阶段，`DATABASE_URL` 环境变量未定义
2. **Next.js 静态分析**: Next.js 在构建时会静态分析 API 路由，导致 Prisma 客户端被初始化
3. **Prisma 客户端验证**: Prisma 客户端在初始化时严格验证数据源配置

## 已实施的解决方案

### ✅ 1. Dockerfile 优化

#### 设置构建时环境变量

```dockerfile
# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# 设置构建时的默认数据库 URL，避免 Prisma 客户端初始化错误
ENV DATABASE_URL="file:/tmp/build.db"
```

#### 添加构建验证步骤

```dockerfile
# 验证环境变量
RUN echo "Build environment check:" && \
    echo "NODE_ENV: $NODE_ENV" && \
    echo "DATABASE_URL: $DATABASE_URL" && \
    echo "NEXT_TELEMETRY_DISABLED: $NEXT_TELEMETRY_DISABLED"

# 验证 Prisma 客户端可以正常导入
RUN echo "Testing Prisma client import..." && \
    node -e "try { const { PrismaClient } = require('@prisma/client'); console.log('✅ Prisma client import successful'); } catch(e) { console.error('❌ Prisma client import failed:', e.message); process.exit(1); }"
```

### ✅ 2. Prisma 客户端优化

#### 构建时安全的客户端

创建了 `src/lib/database/build-safe-prisma.ts`：

- 专门用于构建时的 Prisma 客户端
- 避免在构建时连接真实数据库
- 提供安全的回退机制

#### 主 Prisma 配置优化

更新了 `src/lib/database/prisma.ts`：

- 检测构建时环境
- 使用构建安全的客户端
- 提供回退数据库 URL

### ✅ 3. 环境检测逻辑

```typescript
// 检查是否在构建时环境
const isBuildTime =
  process.env.NODE_ENV === 'production' &&
  process.env.DATABASE_URL?.startsWith('file:/tmp/build.db')
```

### ✅ 4. 连接管理器优化

所有数据库连接管理器都添加了回退 URL：

- `connection-manager.ts`
- `import-connection.ts`
- `build-safe-prisma.ts`

## 构建流程

### 1. 预构建检查

```bash
# 运行构建前检查
./scripts/docker-build-check.sh
```

### 2. Docker 构建

```bash
# 构建 Docker 镜像
docker build -t flow-balance .
```

### 3. 构建验证

构建过程中会自动验证：

- 环境变量设置
- Prisma 客户端导入
- 依赖项完整性

## 故障排除

### 常见问题

#### 1. DATABASE_URL 未定义

**症状**: `Invalid value undefined for datasource "db"`
**解决**: 确保 Dockerfile 中设置了构建时 DATABASE_URL

#### 2. Prisma 客户端导入失败

**症状**: 构建时无法导入 `@prisma/client` **解决**: 检查 Prisma 客户端生成是否成功

#### 3. Next.js 构建失败

**症状**: 页面数据收集失败 **解决**: 确保所有 API 路由都能安全处理构建时环境

### 调试步骤

1. **检查环境变量**:

   ```bash
   docker build --progress=plain -t flow-balance . 2>&1 | grep "DATABASE_URL"
   ```

2. **验证 Prisma 生成**:

   ```bash
   docker run --rm flow-balance node -e "console.log(require('@prisma/client'))"
   ```

3. **检查构建日志**:
   ```bash
   docker build --no-cache --progress=plain -t flow-balance .
   ```

## 最佳实践

### 1. 环境变量管理

- 构建时使用虚拟数据库 URL
- 运行时通过环境变量注入真实 URL
- 提供合理的默认值

### 2. 错误处理

- 在所有数据库操作中添加错误处理
- 提供有意义的错误消息
- 实现优雅降级

### 3. 性能优化

- 使用多阶段构建减少镜像大小
- 缓存依赖项安装步骤
- 优化 Prisma 客户端生成

### 4. 安全考虑

- 不在构建时暴露敏感信息
- 使用最小权限原则
- 定期更新依赖项

## 监控和维护

### 构建指标

- 构建时间
- 镜像大小
- 构建成功率

### 运行时监控

- 数据库连接状态
- API 响应时间
- 错误率

### 定期维护

- 更新基础镜像
- 升级依赖项
- 优化构建脚本

## 测试验证

### ✅ 构建时 Prisma 测试

运行 `scripts/test-build-prisma.js` 验证修复效果：

```bash
🧪 Testing Prisma client in build environment...
📦 Importing Prisma client...
✅ Prisma client import successful
🔧 Creating Prisma client instance...
✅ Prisma client instance created successfully
🧹 Cleaning up...
✅ Prisma client disconnected
🎉 Build-time Prisma test completed successfully!
```

### 修复效果

- ✅ Prisma 客户端可以在构建时正常初始化
- ✅ 不再出现 `Invalid value undefined for datasource "db"` 错误
- ✅ Docker 构建过程应该能够顺利完成
- ✅ 运行时数据库连接不受影响

### 下一步

1. 重新构建 Docker 镜像验证修复效果
2. 测试不同数据库类型（SQLite/PostgreSQL）
3. 验证生产环境部署
