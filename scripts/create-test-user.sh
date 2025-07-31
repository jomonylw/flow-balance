#!/bin/bash

# 创建测试用户脚本
BASE_URL="http://localhost:3001"

echo "👤 创建测试用户..."

# 1. 注册用户
REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"test123456",
    "confirmPassword":"test123456"
  }' \
  "$BASE_URL/api/auth/signup")

echo "注册响应: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
  echo "✅ 用户注册成功"
else
  echo "❌ 用户注册失败，可能用户已存在"
fi

# 2. 尝试登录
echo ""
echo "🔐 测试登录..."

COOKIE_JAR=$(mktemp)
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}' \
  "$BASE_URL/api/auth/login")

echo "登录响应: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo "✅ 登录成功"
  
  # 3. 设置基础货币
  echo ""
  echo "💰 设置基础货币..."
  
  SETUP_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X POST \
    -H "Content-Type: application/json" \
    -d '{"baseCurrencyCode":"CNY"}' \
    "$BASE_URL/api/setup/currency")
  
  echo "设置响应: $SETUP_RESPONSE"
  
  if echo "$SETUP_RESPONSE" | grep -q '"success":true'; then
    echo "✅ 基础货币设置成功"
    echo ""
    echo "🎉 测试用户创建完成！"
    echo "📧 邮箱: test@example.com"
    echo "🔑 密码: test123456"
  else
    echo "❌ 基础货币设置失败"
  fi
  
else
  echo "❌ 登录失败"
fi

# 清理
rm -f "$COOKIE_JAR"
