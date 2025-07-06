#!/bin/bash

# Flow Balance - Docker 配置验证脚本
# 验证 Docker 相关配置文件的正确性

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Flow Balance Docker Configuration Validation${NC}"
echo ""

# 检查文件是否存在
check_file_exists() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $description: $file${NC}"
        return 0
    else
        echo -e "${RED}❌ $description: $file (not found)${NC}"
        return 1
    fi
}

# 验证 Dockerfile 语法
validate_dockerfile() {
    local dockerfile=$1
    local name=$2
    
    echo -e "${YELLOW}🔍 Validating $name...${NC}"
    
    if [ ! -f "$dockerfile" ]; then
        echo -e "${RED}❌ $dockerfile not found${NC}"
        return 1
    fi
    
    # 基本语法检查
    local errors=0
    
    # 检查 FROM 指令
    if ! grep -q "^FROM " "$dockerfile"; then
        echo -e "${RED}❌ No FROM instruction found${NC}"
        errors=$((errors + 1))
    fi
    
    # 检查 WORKDIR 指令
    if ! grep -q "^WORKDIR " "$dockerfile"; then
        echo -e "${RED}❌ No WORKDIR instruction found${NC}"
        errors=$((errors + 1))
    fi
    
    # 检查 COPY 指令语法
    while IFS= read -r line; do
        if [[ $line =~ ^COPY.*\|\|.*true$ ]]; then
            echo -e "${RED}❌ Invalid COPY syntax: $line${NC}"
            errors=$((errors + 1))
        fi
    done < "$dockerfile"
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}✅ $name syntax validation passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $name has $errors syntax errors${NC}"
        return 1
    fi
}

# 验证 Docker Compose 配置
validate_compose() {
    local compose_file=$1
    local name=$2
    
    echo -e "${YELLOW}🔍 Validating $name...${NC}"
    
    if [ ! -f "$compose_file" ]; then
        echo -e "${RED}❌ $compose_file not found${NC}"
        return 1
    fi
    
    # 检查基本结构
    if grep -q "version:" "$compose_file" && grep -q "services:" "$compose_file"; then
        echo -e "${GREEN}✅ $name structure validation passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $name missing required sections${NC}"
        return 1
    fi
}

# 检查构建上下文
check_build_context() {
    echo -e "${YELLOW}🔍 Checking build context...${NC}"
    
    local total_size=0
    local file_count=0
    
    # 计算构建上下文大小（排除 .dockerignore 中的文件）
    if [ -f ".dockerignore" ]; then
        echo -e "${GREEN}✅ .dockerignore found${NC}"
        
        # 显示一些被忽略的大文件夹
        if grep -q "node_modules" ".dockerignore"; then
            echo -e "${GREEN}✅ node_modules excluded${NC}"
        fi
        
        if grep -q "\.next" ".dockerignore"; then
            echo -e "${GREEN}✅ .next excluded${NC}"
        fi
        
        if grep -q "docs/" ".dockerignore"; then
            echo -e "${GREEN}✅ docs/ excluded${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  .dockerignore not found${NC}"
    fi
}

# 验证环境变量配置
validate_env_config() {
    echo -e "${YELLOW}🔍 Checking environment configuration...${NC}"
    
    if [ -f ".env.docker" ]; then
        echo -e "${GREEN}✅ .env.docker found${NC}"
        
        # 检查关键配置
        if grep -q "DATABASE_URL" ".env.docker"; then
            echo -e "${GREEN}✅ DATABASE_URL configured${NC}"
        fi
        
        if grep -q "NODE_ENV" ".env.docker"; then
            echo -e "${GREEN}✅ NODE_ENV configured${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  .env.docker not found${NC}"
    fi
}

# 主验证流程
main() {
    local validation_errors=0
    
    echo -e "${BLUE}📋 File Existence Check:${NC}"
    check_file_exists "Dockerfile" "Original Dockerfile" || validation_errors=$((validation_errors + 1))
    check_file_exists "Dockerfile.optimized" "Optimized Dockerfile" || validation_errors=$((validation_errors + 1))
    check_file_exists "docker-compose.sqlite.yml" "SQLite Compose" || validation_errors=$((validation_errors + 1))
    check_file_exists "docker-compose.optimized.yml" "Optimized Compose" || validation_errors=$((validation_errors + 1))
    check_file_exists ".dockerignore" "Docker ignore file" || validation_errors=$((validation_errors + 1))
    
    echo ""
    echo -e "${BLUE}🔧 Dockerfile Validation:${NC}"
    validate_dockerfile "Dockerfile" "Original Dockerfile" || validation_errors=$((validation_errors + 1))
    validate_dockerfile "Dockerfile.optimized" "Optimized Dockerfile" || validation_errors=$((validation_errors + 1))
    
    echo ""
    echo -e "${BLUE}📦 Docker Compose Validation:${NC}"
    validate_compose "docker-compose.sqlite.yml" "SQLite Compose" || validation_errors=$((validation_errors + 1))
    validate_compose "docker-compose.optimized.yml" "Optimized Compose" || validation_errors=$((validation_errors + 1))
    
    echo ""
    check_build_context
    
    echo ""
    validate_env_config
    
    echo ""
    echo -e "${BLUE}📊 Validation Summary:${NC}"
    if [ $validation_errors -eq 0 ]; then
        echo -e "${GREEN}✅ All validations passed! Docker configuration is ready.${NC}"
        echo ""
        echo -e "${BLUE}🚀 Next Steps:${NC}"
        echo -e "  1. Install Docker if not already installed"
        echo -e "  2. Run: docker build -f Dockerfile.optimized -t flow-balance:optimized ."
        echo -e "  3. Run: docker-compose -f docker-compose.optimized.yml up -d"
        return 0
    else
        echo -e "${RED}❌ Found $validation_errors validation errors.${NC}"
        echo -e "${YELLOW}Please fix the errors before building Docker images.${NC}"
        return 1
    fi
}

# 运行主函数
main
