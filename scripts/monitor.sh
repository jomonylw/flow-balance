#!/bin/bash

# Flow Balance - Monitoring Script
# 应用监控脚本，检查服务状态和性能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
APP_URL="${APP_URL:-http://localhost:3000}"
HEALTH_ENDPOINT="$APP_URL/api/health"
CONTAINER_NAME="${CONTAINER_NAME:-flow-balance}"
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"

# 打印函数
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} Flow Balance 监控面板${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "ok")
            echo -e "${GREEN}[✓]${NC} $message"
            ;;
        "warning")
            echo -e "${YELLOW}[!]${NC} $message"
            ;;
        "error")
            echo -e "${RED}[✗]${NC} $message"
            ;;
        "info")
            echo -e "${BLUE}[i]${NC} $message"
            ;;
    esac
}

# 检查应用健康状态
check_app_health() {
    local response
    local status_code
    
    print_status "info" "检查应用健康状态..."
    
    # 发送健康检查请求
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$HEALTH_ENDPOINT" 2>/dev/null || echo "HTTPSTATUS:000")
    status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$status_code" = "200" ]; then
        print_status "ok" "应用健康检查通过 (HTTP $status_code)"
        
        # 解析健康检查响应
        if command -v jq > /dev/null && [ -n "$body" ]; then
            local app_status=$(echo "$body" | jq -r '.status // "unknown"')
            local version=$(echo "$body" | jq -r '.version // "unknown"')
            local uptime=$(echo "$body" | jq -r '.uptime // 0')
            local db_status=$(echo "$body" | jq -r '.database // "unknown"')
            
            echo "    状态: $app_status"
            echo "    版本: $version"
            echo "    运行时间: ${uptime}s"
            echo "    数据库: $db_status"
        fi
    elif [ "$status_code" = "000" ]; then
        print_status "error" "无法连接到应用 ($APP_URL)"
    else
        print_status "error" "应用健康检查失败 (HTTP $status_code)"
    fi
    
    echo ""
    return $([ "$status_code" = "200" ] && echo 0 || echo 1)
}

# 检查 Docker 容器状态
check_docker_status() {
    print_status "info" "检查 Docker 容器状态..."
    
    if ! command -v docker > /dev/null; then
        print_status "warning" "Docker 未安装，跳过容器检查"
        echo ""
        return 0
    fi
    
    # 检查容器是否存在
    if docker ps -a --format "table {{.Names}}" | grep -q "^$CONTAINER_NAME$"; then
        local container_status=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "^$CONTAINER_NAME" | cut -f2)
        
        if [ -n "$container_status" ]; then
            if echo "$container_status" | grep -q "Up"; then
                print_status "ok" "容器运行中: $container_status"
                
                # 获取容器资源使用情况
                local stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" "$CONTAINER_NAME" 2>/dev/null)
                if [ -n "$stats" ]; then
                    echo "    资源使用: $stats"
                fi
            else
                print_status "error" "容器已停止: $container_status"
            fi
        else
            print_status "error" "容器 $CONTAINER_NAME 不存在"
        fi
    else
        print_status "warning" "未找到容器 $CONTAINER_NAME"
    fi
    
    echo ""
}

# 检查 Docker Compose 服务
check_compose_status() {
    print_status "info" "检查 Docker Compose 服务..."
    
    if ! command -v docker-compose > /dev/null; then
        print_status "warning" "Docker Compose 未安装，跳过服务检查"
        echo ""
        return 0
    fi
    
    if [ -f "docker-compose.yml" ]; then
        local services=$(docker-compose ps --services 2>/dev/null)
        
        if [ -n "$services" ]; then
            echo "$services" | while read -r service; do
                local status=$(docker-compose ps "$service" 2>/dev/null | tail -n +3 | awk '{print $4}')
                if [ "$status" = "Up" ]; then
                    print_status "ok" "服务 $service: 运行中"
                else
                    print_status "error" "服务 $service: $status"
                fi
            done
        else
            print_status "warning" "未找到运行中的 Compose 服务"
        fi
    else
        print_status "warning" "未找到 docker-compose.yml 文件"
    fi
    
    echo ""
}

# 检查系统资源
check_system_resources() {
    print_status "info" "检查系统资源..."
    
    # 检查内存使用
    if command -v free > /dev/null; then
        local memory_info=$(free -h | grep "Mem:")
        local used_mem=$(echo "$memory_info" | awk '{print $3}')
        local total_mem=$(echo "$memory_info" | awk '{print $2}')
        print_status "info" "内存使用: $used_mem / $total_mem"
    fi
    
    # 检查磁盘使用
    if command -v df > /dev/null; then
        local disk_usage=$(df -h / | tail -1 | awk '{print $5}')
        local disk_used=$(echo "$disk_usage" | sed 's/%//')
        
        if [ "$disk_used" -gt 90 ]; then
            print_status "error" "磁盘使用率过高: $disk_usage"
        elif [ "$disk_used" -gt 80 ]; then
            print_status "warning" "磁盘使用率较高: $disk_usage"
        else
            print_status "ok" "磁盘使用率: $disk_usage"
        fi
    fi
    
    # 检查 CPU 负载
    if command -v uptime > /dev/null; then
        local load_avg=$(uptime | awk -F'load average:' '{print $2}' | sed 's/^ *//')
        print_status "info" "系统负载: $load_avg"
    fi
    
    echo ""
}

# 检查网络连接
check_network() {
    print_status "info" "检查网络连接..."
    
    # 检查端口是否开放
    local port=$(echo "$APP_URL" | sed 's/.*://' | sed 's/\/.*//')
    if [ -z "$port" ] || [ "$port" = "$APP_URL" ]; then
        port=3000
    fi
    
    if command -v netstat > /dev/null; then
        if netstat -tuln | grep -q ":$port "; then
            print_status "ok" "端口 $port 正在监听"
        else
            print_status "error" "端口 $port 未开放"
        fi
    elif command -v ss > /dev/null; then
        if ss -tuln | grep -q ":$port "; then
            print_status "ok" "端口 $port 正在监听"
        else
            print_status "error" "端口 $port 未开放"
        fi
    else
        print_status "warning" "无法检查端口状态（缺少 netstat 或 ss）"
    fi
    
    echo ""
}

# 检查日志错误
check_logs() {
    print_status "info" "检查应用日志..."
    
    local error_count=0
    
    # 检查 Docker 容器日志
    if command -v docker > /dev/null && docker ps | grep -q "$CONTAINER_NAME"; then
        local recent_errors=$(docker logs --since="1h" "$CONTAINER_NAME" 2>&1 | grep -i "error\|exception\|failed" | wc -l)
        if [ "$recent_errors" -gt 0 ]; then
            print_status "warning" "发现 $recent_errors 个错误日志（最近1小时）"
            error_count=$((error_count + recent_errors))
        else
            print_status "ok" "未发现错误日志（最近1小时）"
        fi
    fi
    
    # 检查系统日志
    if command -v journalctl > /dev/null; then
        local system_errors=$(journalctl --since="1 hour ago" --priority=err --no-pager -q | wc -l)
        if [ "$system_errors" -gt 0 ]; then
            print_status "warning" "发现 $system_errors 个系统错误（最近1小时）"
        fi
    fi
    
    echo ""
    return $error_count
}

# 生成监控报告
generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="monitoring-report-$(date '+%Y%m%d-%H%M%S').txt"
    
    {
        echo "Flow Balance 监控报告"
        echo "生成时间: $timestamp"
        echo "应用地址: $APP_URL"
        echo "================================"
        echo ""
        
        # 重新运行所有检查并记录结果
        check_app_health
        check_docker_status
        check_compose_status
        check_system_resources
        check_network
        check_logs
        
    } > "$report_file"
    
    print_status "ok" "监控报告已生成: $report_file"
}

# 持续监控模式
continuous_monitoring() {
    print_status "info" "启动持续监控模式 (间隔: ${CHECK_INTERVAL}s)"
    print_status "info" "按 Ctrl+C 停止监控"
    echo ""
    
    while true; do
        local timestamp=$(date '+%H:%M:%S')
        echo -e "${BLUE}[$timestamp] 执行健康检查...${NC}"
        
        if check_app_health > /dev/null 2>&1; then
            echo -e "${GREEN}[$timestamp] ✓ 应用正常${NC}"
        else
            echo -e "${RED}[$timestamp] ✗ 应用异常${NC}"
            
            # 发送告警（可以扩展为邮件、Slack 等）
            print_status "error" "检测到应用异常，请检查！"
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# 显示帮助
show_help() {
    echo "Flow Balance 监控脚本"
    echo ""
    echo "用法:"
    echo "  $0 [command] [options]"
    echo ""
    echo "命令:"
    echo "  check     执行一次完整检查（默认）"
    echo "  monitor   持续监控模式"
    echo "  report    生成监控报告"
    echo "  health    仅检查应用健康状态"
    echo "  docker    仅检查 Docker 状态"
    echo "  system    仅检查系统资源"
    echo ""
    echo "环境变量:"
    echo "  APP_URL           应用地址 (默认: http://localhost:3000)"
    echo "  CONTAINER_NAME    容器名称 (默认: flow-balance)"
    echo "  CHECK_INTERVAL    监控间隔秒数 (默认: 30)"
    echo ""
    echo "示例:"
    echo "  $0 check"
    echo "  $0 monitor"
    echo "  APP_URL=https://myapp.com $0 health"
    echo ""
}

# 主函数
main() {
    local command=${1:-check}
    
    case $command in
        "check")
            print_header
            check_app_health
            check_docker_status
            check_compose_status
            check_system_resources
            check_network
            check_logs
            ;;
        "monitor")
            print_header
            continuous_monitoring
            ;;
        "report")
            print_header
            generate_report
            ;;
        "health")
            check_app_health
            ;;
        "docker")
            check_docker_status
            check_compose_status
            ;;
        "system")
            check_system_resources
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            echo "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
