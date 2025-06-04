-- 添加账户类型字段到分类表
-- 这个迁移脚本需要手动执行，因为需要根据现有数据的语义来设置账户类型

-- 1. 添加账户类型枚举（如果使用 PostgreSQL）
-- CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE');

-- 2. 添加 type 字段到 categories 表
-- ALTER TABLE "categories" ADD COLUMN "type" "AccountType";

-- 3. 根据分类名称的语义来设置账户类型
-- 资产类账户
UPDATE categories SET type = 'ASSET' WHERE 
  name LIKE '%银行%' OR 
  name LIKE '%现金%' OR 
  name LIKE '%存款%' OR 
  name LIKE '%投资%' OR 
  name LIKE '%股票%' OR 
  name LIKE '%基金%' OR 
  name LIKE '%债券%' OR 
  name LIKE '%房产%' OR 
  name LIKE '%车辆%' OR 
  name LIKE '%资产%' OR
  name LIKE '%Cash%' OR
  name LIKE '%Bank%' OR
  name LIKE '%Investment%' OR
  name LIKE '%Asset%';

-- 负债类账户  
UPDATE categories SET type = 'LIABILITY' WHERE 
  name LIKE '%信用卡%' OR 
  name LIKE '%贷款%' OR 
  name LIKE '%借款%' OR 
  name LIKE '%应付%' OR 
  name LIKE '%负债%' OR
  name LIKE '%Credit%' OR
  name LIKE '%Loan%' OR
  name LIKE '%Debt%' OR
  name LIKE '%Liability%';

-- 收入类账户
UPDATE categories SET type = 'INCOME' WHERE 
  name LIKE '%工资%' OR 
  name LIKE '%薪水%' OR 
  name LIKE '%收入%' OR 
  name LIKE '%奖金%' OR 
  name LIKE '%分红%' OR 
  name LIKE '%利息%' OR 
  name LIKE '%租金%' OR
  name LIKE '%Salary%' OR
  name LIKE '%Income%' OR
  name LIKE '%Revenue%' OR
  name LIKE '%Bonus%';

-- 支出类账户
UPDATE categories SET type = 'EXPENSE' WHERE 
  name LIKE '%餐饮%' OR 
  name LIKE '%交通%' OR 
  name LIKE '%购物%' OR 
  name LIKE '%娱乐%' OR 
  name LIKE '%医疗%' OR 
  name LIKE '%教育%' OR 
  name LIKE '%住房%' OR 
  name LIKE '%水电%' OR 
  name LIKE '%通讯%' OR 
  name LIKE '%支出%' OR 
  name LIKE '%费用%' OR
  name LIKE '%Food%' OR
  name LIKE '%Transport%' OR
  name LIKE '%Shopping%' OR
  name LIKE '%Entertainment%' OR
  name LIKE '%Medical%' OR
  name LIKE '%Education%' OR
  name LIKE '%Expense%';

-- 4. 为未匹配的分类设置默认类型（根据父分类或手动设置）
-- 如果父分类已有类型，则继承父分类的类型
UPDATE categories 
SET type = (
  SELECT parent.type 
  FROM categories parent 
  WHERE parent.id = categories.parentId 
  AND parent.type IS NOT NULL
)
WHERE type IS NULL AND parentId IS NOT NULL;

-- 5. 为仍然没有类型的顶级分类设置默认类型
-- 这里需要根据具体情况手动设置，或者设置为 ASSET 作为默认值
UPDATE categories SET type = 'ASSET' WHERE type IS NULL AND parentId IS NULL;

-- 6. 如果使用 SQLite，需要重新创建表来添加枚举约束
-- 这里提供 SQLite 的处理方式：

-- 创建新表
CREATE TABLE categories_new (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  parentId TEXT,
  type TEXT CHECK(type IN ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE')),
  "order" INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parentId) REFERENCES categories(id),
  UNIQUE(userId, name, parentId)
);

-- 复制数据
INSERT INTO categories_new (id, userId, name, parentId, type, "order", createdAt, updatedAt)
SELECT id, userId, name, parentId, 
  CASE 
    WHEN name LIKE '%银行%' OR name LIKE '%现金%' OR name LIKE '%存款%' OR name LIKE '%投资%' OR name LIKE '%股票%' OR name LIKE '%基金%' OR name LIKE '%债券%' OR name LIKE '%房产%' OR name LIKE '%车辆%' OR name LIKE '%资产%' THEN 'ASSET'
    WHEN name LIKE '%信用卡%' OR name LIKE '%贷款%' OR name LIKE '%借款%' OR name LIKE '%应付%' OR name LIKE '%负债%' THEN 'LIABILITY'
    WHEN name LIKE '%工资%' OR name LIKE '%薪水%' OR name LIKE '%收入%' OR name LIKE '%奖金%' OR name LIKE '%分红%' OR name LIKE '%利息%' OR name LIKE '%租金%' THEN 'INCOME'
    WHEN name LIKE '%餐饮%' OR name LIKE '%交通%' OR name LIKE '%购物%' OR name LIKE '%娱乐%' OR name LIKE '%医疗%' OR name LIKE '%教育%' OR name LIKE '%住房%' OR name LIKE '%水电%' OR name LIKE '%通讯%' OR name LIKE '%支出%' OR name LIKE '%费用%' THEN 'EXPENSE'
    ELSE 'ASSET'
  END as type,
  "order", createdAt, updatedAt
FROM categories;

-- 删除旧表并重命名新表
-- DROP TABLE categories;
-- ALTER TABLE categories_new RENAME TO categories;

-- 注意：实际执行时需要根据使用的数据库类型选择相应的 SQL 语句
-- PostgreSQL 使用前面的 ALTER TABLE 语句
-- SQLite 使用后面的重建表的方式
