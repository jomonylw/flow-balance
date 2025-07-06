#!/bin/bash

# Flow Balance - Quick Start Script
# 快速启动脚本，支持多种部署方式

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} Flow Balance Quick Start${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

# 检查依赖
check_dependencies() {
    print_message "检查系统依赖..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        echo "安装指南: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        echo "安装指南: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_message "依赖检查完成 ✓"
}

# 生成安全密钥
generate_secrets() {
    print_message "生成安全密钥..."
    
    # 生成 JWT 密钥
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    
    # 生成 NextAuth 密钥
    NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    
    # 生成数据库密码
    DB_PASSWORD=$(openssl rand -base64 16 2>/dev/null || head -c 16 /dev/urandom | base64 | tr -d '=+/')
    
    print_message "密钥生成完成 ✓"
}

# 创建环境变量文件
create_env_file() {
    local db_type=$1
    local app_url=$2
    
    print_message "创建环境变量文件..."
    
    cat > .env << EOF
# Flow Balance - 自动生成的环境变量配置
# 生成时间: $(date)

# ===========================================
# 基础配置
# ===========================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=${app_url}
NEXT_TELEMETRY_DISABLED=1

# ===========================================
# 安全配置（已自动生成）
# ===========================================
JWT_SECRET=${JWT_SECRET}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# ===========================================
# 数据库配置
# ===========================================
EOF

    if [ "$db_type" = "sqlite" ]; then
        cat >> .env << EOF
DATABASE_URL=file:./data/production.db
EOF
    else
        cat >> .env << EOF
DATABASE_URL=postgresql://flowbalance:${DB_PASSWORD}@postgres:5432/flowbalance?schema=public
POSTGRES_DB=flowbalance
POSTGRES_USER=flowbalance
POSTGRES_PASSWORD=${DB_PASSWORD}
EOF
    fi
    
    print_message "环境变量文件创建完成 ✓"
}

# 下载 Docker Compose 文件
download_compose_files() {
    print_message "准备 Docker Compose 配置..."
    
    # 如果文件不存在，创建基本的 docker-compose.yml
    if [ ! -f "docker-compose.yml" ]; then
        print_message "创建 Docker Compose 配置文件..."
        
        cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    image: ghcr.io/your-username/flow-balance:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
      - NEXT_TELEMETRY_DISABLED=1
    volumes:
      - app_data:/app/data
    depends_on:
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-flowbalance}
      - POSTGRES_USER=${POSTGRES_USER:-flowbalance}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-flowbalance}"]
      interval: 10s
      timeout: 5s
      retries: 5
    profiles:
      - postgres

volumes:
  app_data:
  postgres_data:
EOF
    fi
    
    print_message "Docker Compose 配置准备完成 ✓"
}

# 启动服务
start_services() {
    local db_type=$1
    
    print_message "启动 Flow Balance 服务..."
    
    if [ "$db_type" = "sqlite" ]; then
        print_message "使用 SQLite 数据库启动..."
        docker-compose up -d app
    else
        print_message "使用 PostgreSQL 数据库启动..."
        docker-compose --profile postgres up -d
    fi
    
    print_message "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        print_message "服务启动成功 ✓"
    else
        print_error "服务启动失败"
        print_message "查看日志："
        docker-compose logs
        exit 1
    fi
}

# 显示访问信息
show_access_info() {
    local app_url=$1
    
    echo ""
    echo -e "${GREEN}🎉 Flow Balance 部署成功！${NC}"
    echo ""
    echo -e "${BLUE}访问信息：${NC}"
    echo -e "  应用地址: ${app_url}"
    echo -e "  健康检查: ${app_url}/api/health"
    echo ""
    echo -e "${BLUE}管理命令：${NC}"
    echo -e "  查看状态: ${YELLOW}docker-compose ps${NC}"
    echo -e "  查看日志: ${YELLOW}docker-compose logs -f app${NC}"
    echo -e "  停止服务: ${YELLOW}docker-compose down${NC}"
    echo -e "  重启服务: ${YELLOW}docker-compose restart${NC}"
    echo ""
    echo -e "${BLUE}数据管理：${NC}"
    echo -e "  备份数据: ${YELLOW}docker-compose exec app pnpm db:backup${NC}"
    echo -e "  查看数据: ${YELLOW}docker-compose exec app pnpm db:studio${NC}"
    echo ""
}

# 主菜单
show_menu() {
    echo ""
    echo "请选择部署方式："
    echo "1) SQLite 数据库（推荐个人使用）"
    echo "2) PostgreSQL 数据库（推荐生产环境）"
    echo "3) 自定义配置"
    echo "4) 退出"
    echo ""
    read -p "请输入选项 (1-4): " choice
    
    case $choice in
        1)
            deploy_sqlite
            ;;
        2)
            deploy_postgresql
            ;;
        3)
            deploy_custom
            ;;
        4)
            print_message "退出安装"
            exit 0
            ;;
        *)
            print_error "无效选项，请重新选择"
            show_menu
            ;;
    esac
}

# SQLite 部署
deploy_sqlite() {
    print_message "选择 SQLite 部署模式"
    
    # 获取应用 URL
    read -p "请输入应用访问地址 (默认: http://localhost:3000): " app_url
    app_url=${app_url:-http://localhost:3000}
    
    generate_secrets
    create_env_file "sqlite" "$app_url"
    download_compose_files
    start_services "sqlite"
    show_access_info "$app_url"
}

# PostgreSQL 部署
deploy_postgresql() {
    print_message "选择 PostgreSQL 部署模式"
    
    # 获取应用 URL
    read -p "请输入应用访问地址 (默认: http://localhost:3000): " app_url
    app_url=${app_url:-http://localhost:3000}
    
    generate_secrets
    create_env_file "postgresql" "$app_url"
    download_compose_files
    start_services "postgresql"
    show_access_info "$app_url"
}

# 自定义部署
deploy_custom() {
    print_message "自定义配置模式"
    
    if [ -f ".env" ]; then
        print_warning "发现现有 .env 文件"
        read -p "是否使用现有配置？(y/n): " use_existing
        if [ "$use_existing" != "y" ]; then
            print_message "请手动编辑 .env 文件后重新运行"
            exit 0
        fi
    else
        print_error "未找到 .env 文件"
        print_message "请先复制 .env.example 到 .env 并配置后重新运行"
        exit 1
    fi
    
    download_compose_files
    
    # 检测数据库类型
    if grep -q "postgresql://" .env; then
        start_services "postgresql"
    else
        start_services "sqlite"
    fi
    
    app_url=$(grep NEXT_PUBLIC_APP_URL .env | cut -d'=' -f2 | tr -d '"')
    show_access_info "${app_url:-http://localhost:3000}"
}

# 主函数
main() {
    print_header
    
    # 检查是否在正确的目录
    if [ ! -f "package.json" ] || ! grep -q "flow-balance\|persional-balance-sheet" package.json; then
        print_error "请在 Flow Balance 项目根目录运行此脚本"
        exit 1
    fi
    
    check_dependencies
    show_menu
}

# 运行主函数
main "$@"
