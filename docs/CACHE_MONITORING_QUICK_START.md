# 缓存监控快速开始指南

## 🚀 快速开始

### 1. 启动开发服务器

```bash
npm run dev
```

### 2. 访问监控页面

- **简单测试页面**: http://localhost:3000/dev/cache-test
- **详细监控面板**: http://localhost:3000/dev/cache-monitor

### 3. 查看控制台日志

打开浏览器开发者工具，在 Console 标签页中查看缓存日志：

```bash
🎯 [CACHE HIT] getCachedUserTags
  📋 Key: get-cached-user-tags-user123
  ⚡ Time: 2.34ms
  📊 Hit Rate: 85.7%

❌ [CACHE MISS] getCachedUserCurrencies
  📋 Key: get-user-currencies-user123
  🐌 Time: 45.67ms
  📊 Hit Rate: 72.3%
```

## 📊 监控功能

### 实时日志标识

- **🎯 绿色**: 缓存命中，响应时间通常 < 5ms
- **❌ 黄色**: 缓存未命中，需要查询数据库
- **💥 红色**: 缓存错误，需要检查代码

### 性能等级

- **🟢 优秀**: 命中率 ≥ 80%
- **🟡 良好**: 命中率 60-79%
- **🔴 需优化**: 命中率 < 60%

## 🔧 使用方法

### 1. 测试缓存功能

访问 `/dev/cache-test` 页面：

- 点击各个 API 按钮测试缓存
- 多次点击同一按钮观察缓存命中
- 查看控制台的实时日志输出

### 2. 查看详细统计

访问 `/dev/cache-monitor` 页面：

- 查看全局缓存统计
- 查看函数级性能数据
- 获取优化建议

### 3. API 接口

```bash
# 获取缓存统计
curl http://localhost:3000/api/dev/cache-stats

# 重置统计数据
curl -X DELETE http://localhost:3000/api/dev/cache-stats

# 触发性能分析
curl -X POST http://localhost:3000/api/dev/cache-stats \
  -H "Content-Type: application/json" \
  -d '{"action": "analyze"}'
```

## 📈 优化建议

### 低命中率优化

如果看到命中率 < 60% 的函数：

1. 检查缓存 TTL 是否过短
2. 检查缓存失效是否过于频繁
3. 优化缓存键的设计

### 高频调用优化

对于调用次数多但命中率低的函数：

1. 优先优化这些函数
2. 考虑预加载策略
3. 增加缓存时间

### 错误处理

如果出现缓存错误：

1. 检查数据库连接
2. 检查缓存函数实现
3. 查看详细错误日志

## 🎯 目标指标

- **整体命中率**: > 80%
- **高频函数命中率**: > 85%
- **缓存错误率**: < 1%
- **API 响应时间**: 减少 70%+

## 📋 注意事项

1. **仅开发环境**: 监控功能仅在 `NODE_ENV=development` 下启用
2. **性能影响**: 监控代码对性能影响极小（< 1ms）
3. **数据准确性**: 缓存命中检测基于执行时间（< 5ms 视为命中）

## 🛠️ 故障排除

### 监控页面无法访问

- 确认在开发环境下运行
- 检查 URL 是否正确
- 查看浏览器控制台错误

### 没有缓存日志

- 确认调用了带监控的 API
- 检查控制台是否有错误
- 验证 API 路由是否正确集成

### 统计数据异常

- 重置统计数据重新测试
- 检查 API 调用是否成功
- 验证缓存函数是否正确实现

## 📚 相关文档

- `docs/CACHE_MONITORING_GUIDE.md` - 详细使用指南
- `docs/CACHE_MONITORING_IMPLEMENTATION_SUMMARY.md` - 实现总结
- `scripts/test-cache-monitoring.js` - 自动化测试脚本

## 🎉 开始使用

1. 启动开发服务器: `npm run dev`
2. 访问测试页面: http://localhost:3000/dev/cache-test
3. 点击 API 按钮测试缓存功能
4. 观察控制台的缓存日志输出
5. 访问监控面板查看详细统计

**现在就开始监控你的缓存性能吧！** 🚀
