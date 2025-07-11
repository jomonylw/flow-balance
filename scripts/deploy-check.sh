#!/bin/bash

# Flow Balance - Deployment Check Script
# 部署前检查脚本，验证环境和配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查结果统计
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# 打印函数
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} Flow Balance 部署检查${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_check() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((CHECKS_PASSED++))
}

print_fail() {
    echo -e "${RED}[✗]${NC} $1"
    ((CHECKS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# 检查必需的工具
check_tools() {
    echo "🔧 检查必需工具..."
    
    # 检查 Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        if [[ "$NODE_VERSION" =~ ^v1[8-9]\.|^v[2-9][0-9]\. ]]; then
            print_check "Node.js $NODE_VERSION"
        else
            print_fail "Node.js 版本过低 ($NODE_VERSION)，需要 18.0+"
        fi
    else
        print_fail "Node.js 未安装"
    fi
    
    # 检查 pnpm
    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm --version 2>/dev/null || echo "unknown")
        print_check "pnpm $PNPM_VERSION"
    else
        print_fail "pnpm 未安装"
    fi
    
    # 检查 Docker（可选）
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_check "Docker $DOCKER_VERSION"
        
        # 检查 Docker 是否运行
        if docker info &> /dev/null; then
            print_check "Docker 服务运行中"
        else
            print_warning "Docker 服务未运行"
        fi
    else
        print_warning "Docker 未安装（可选）"
    fi
    
    # 检查 Docker Compose（可选）
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
        print_check "Docker Compose $COMPOSE_VERSION"
    else
        print_warning "Docker Compose 未安装（可选）"
    fi
    
    echo ""
}

# 检查项目文件
check_project_files() {
    echo "📁 检查项目文件..."
    
    # 必需文件
    required_files=(
        "package.json"
        "next.config.js"
        "prisma/schema.prisma"
        "src/app/layout.tsx"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            print_check "$file 存在"
        else
            print_fail "$file 缺失"
        fi
    done
    
    # Docker 文件
    docker_files=(
        "Dockerfile"
        "docker-compose.yml"
        ".dockerignore"
    )
    
    for file in "${docker_files[@]}"; do
        if [ -f "$file" ]; then
            print_check "$file 存在"
        else
            print_warning "$file 缺失（Docker 部署需要）"
        fi
    done
    
    echo ""
}

# 检查环境变量
check_environment() {
    echo "🔧 检查环境变量..."
    
    # 检查 .env 文件
    if [ -f ".env" ]; then
        print_check ".env 文件存在"
        
        # 检查必需的环境变量
        required_vars=("DATABASE_URL")

        for var in "${required_vars[@]}"; do
            if grep -q "^${var}=" .env; then
                value=$(grep "^${var}=" .env | cut -d'=' -f2- | tr -d '"')
                if [ -n "$value" ] && [ "$value" != "your-secret-here" ]; then
                    print_check "$var 已配置"
                else
                    print_fail "$var 未正确配置"
                fi
            else
                print_fail "$var 缺失"
            fi
        done

        # 检查可选的 JWT_SECRET
        if grep -q "^JWT_SECRET=" .env; then
            jwt_secret=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2- | tr -d '"')
            if [ ${#jwt_secret} -ge 32 ]; then
                print_check "JWT_SECRET 已配置 (${#jwt_secret} 字符)"
            else
                print_warning "JWT_SECRET 较短 (${#jwt_secret} 字符)，建议至少 32 字符"
            fi
        else
            print_info "JWT_SECRET 未配置，将自动生成"
        fi
        
    else
        print_fail ".env 文件不存在"
        print_info "请复制 .env.example 到 .env 并配置"
    fi
    
    echo ""
}

# 检查依赖
check_dependencies() {
    echo "📦 检查项目依赖..."
    
    if [ -f "package.json" ]; then
        if [ -d "node_modules" ]; then
            print_check "node_modules 存在"
            
            # 检查关键依赖
            key_deps=("next" "react" "@prisma/client" "prisma")
            
            for dep in "${key_deps[@]}"; do
                if [ -d "node_modules/$dep" ]; then
                    print_check "$dep 已安装"
                else
                    print_fail "$dep 未安装"
                fi
            done
        else
            print_fail "依赖未安装，请运行 pnpm install"
        fi
    else
        print_fail "package.json 不存在"
    fi
    
    echo ""
}

# 检查数据库
check_database() {
    echo "🗄️  检查数据库配置..."
    
    if [ -f ".env" ]; then
        database_url=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"')
        
        if [[ "$database_url" == file:* ]]; then
            print_check "SQLite 数据库配置"
            
            # 检查 Prisma 客户端
            if [ -d "node_modules/.prisma" ]; then
                print_check "Prisma 客户端已生成"
            else
                print_warning "Prisma 客户端未生成，请运行 pnpm db:generate"
            fi
            
        elif [[ "$database_url" == postgresql://* ]]; then
            print_check "PostgreSQL 数据库配置"
            
            # 尝试连接数据库（如果有 psql）
            if command -v psql &> /dev/null; then
                if psql "$database_url" -c "SELECT 1;" &> /dev/null; then
                    print_check "数据库连接成功"
                else
                    print_warning "数据库连接失败，请检查配置"
                fi
            else
                print_info "psql 未安装，跳过连接测试"
            fi
            
        else
            print_warning "未知的数据库类型"
        fi
    fi
    
    echo ""
}

# 检查构建
check_build() {
    echo "🔨 检查构建配置..."
    
    # 检查 TypeScript 配置
    if [ -f "tsconfig.json" ]; then
        print_check "TypeScript 配置存在"
    else
        print_warning "tsconfig.json 缺失"
    fi
    
    # 检查 Tailwind 配置
    if [ -f "tailwind.config.ts" ] || [ -f "tailwind.config.js" ]; then
        print_check "Tailwind CSS 配置存在"
    else
        print_warning "Tailwind 配置缺失"
    fi
    
    # 检查 ESLint 配置
    if [ -f "eslint.config.mjs" ] || [ -f ".eslintrc.json" ]; then
        print_check "ESLint 配置存在"
    else
        print_warning "ESLint 配置缺失"
    fi
    
    echo ""
}

# 检查安全配置
check_security() {
    echo "🔒 检查安全配置..."
    
    if [ -f ".env" ]; then
        # 检查是否使用默认密钥
        if grep -q "your-secret-here\|change-this\|default" .env; then
            print_fail "发现默认密钥，请更改为安全的值"
        else
            print_check "未发现明显的默认密钥"
        fi
        
        # 检查是否有敏感信息
        if grep -q "password.*123\|secret.*123\|key.*123" .env; then
            print_warning "发现可能不安全的密码"
        fi
    fi
    
    # 检查 .env 是否在 .gitignore 中
    if [ -f ".gitignore" ]; then
        if grep -q "\.env" .gitignore; then
            print_check ".env 已在 .gitignore 中"
        else
            print_fail ".env 未在 .gitignore 中，存在泄露风险"
        fi
    fi
    
    echo ""
}

# 性能建议
performance_suggestions() {
    echo "⚡ 性能建议..."
    
    # 检查是否启用了生产优化
    if [ -f "next.config.js" ]; then
        if grep -q "output.*standalone" next.config.js; then
            print_check "启用了 standalone 输出（Docker 优化）"
        else
            print_info "建议启用 standalone 输出用于 Docker 部署"
        fi
    fi
    
    # 检查图片优化配置
    if [ -f "next.config.js" ]; then
        if grep -q "images" next.config.js; then
            print_check "配置了图片优化"
        else
            print_info "建议配置图片优化"
        fi
    fi
    
    echo ""
}

# 显示总结
show_summary() {
    echo "📊 检查总结"
    echo "================================"
    echo -e "✅ 通过: ${GREEN}$CHECKS_PASSED${NC}"
    echo -e "❌ 失败: ${RED}$CHECKS_FAILED${NC}"
    echo -e "⚠️  警告: ${YELLOW}$WARNINGS${NC}"
    echo ""
    
    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 所有关键检查都通过了！项目可以部署。${NC}"
        
        if [ $WARNINGS -gt 0 ]; then
            echo -e "${YELLOW}💡 建议处理警告项以获得更好的体验。${NC}"
        fi
        
        echo ""
        echo "🚀 推荐的部署命令："
        echo "  make quick-start    # 交互式快速部署"
        echo "  make docker-prod    # Docker 生产环境"
        echo "  make deploy:vercel  # Vercel 部署"
        
    else
        echo -e "${RED}❌ 发现 $CHECKS_FAILED 个关键问题，请修复后再部署。${NC}"
        exit 1
    fi
}

# 主函数
main() {
    print_header
    
    check_tools
    check_project_files
    check_environment
    check_dependencies
    check_database
    check_build
    check_security
    performance_suggestions
    
    show_summary
}

# 运行检查
main "$@"
