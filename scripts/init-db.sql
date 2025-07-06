-- Flow Balance - Database Initialization Script
-- PostgreSQL 数据库初始化脚本

-- 创建数据库（如果不存在）
-- 注意：这个脚本在 Docker 容器启动时自动执行

-- 设置时区
SET timezone = 'UTC';

-- 创建扩展（如果需要）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 创建索引优化查询性能（Prisma 迁移后执行）
-- 这些索引将在应用启动后通过 Prisma 迁移自动创建

-- 用户相关索引
-- CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- CREATE INDEX IF NOT EXISTS idx_users_recovery_key ON users(recovery_key);

-- 账户相关索引
-- CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
-- CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
-- CREATE INDEX IF NOT EXISTS idx_accounts_currency_id ON accounts(currency_id);

-- 交易相关索引
-- CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
-- CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
-- CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
-- CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- 分类相关索引
-- CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
-- CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- 汇率相关索引
-- CREATE INDEX IF NOT EXISTS idx_exchange_rates_user_id ON exchange_rates(user_id);
-- CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_to ON exchange_rates(from_currency_id, to_currency_id);
-- CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(date);

-- 设置数据库参数优化性能
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- 重新加载配置
SELECT pg_reload_conf();

-- 输出初始化完成信息
DO $$
BEGIN
    RAISE NOTICE 'Flow Balance database initialization completed successfully!';
    RAISE NOTICE 'Database: %', current_database();
    RAISE NOTICE 'Version: %', version();
    RAISE NOTICE 'Timezone: %', current_setting('timezone');
END $$;
