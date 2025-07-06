#!/bin/bash

# Flow Balance - Release Script
# 自动化版本发布脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} Flow Balance 版本发布${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# 检查 Git 状态
check_git_status() {
    print_info "检查 Git 状态..."
    
    # 检查是否在 Git 仓库中
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "当前目录不是 Git 仓库"
        exit 1
    fi
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        print_error "存在未提交的更改，请先提交或暂存"
        git status --porcelain
        exit 1
    fi
    
    # 检查是否在 main 分支
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
        print_warning "当前不在 main/master 分支 (当前: $current_branch)"
        read -p "是否继续？(y/n): " continue_release
        if [ "$continue_release" != "y" ]; then
            exit 0
        fi
    fi
    
    print_success "Git 状态检查通过"
}

# 获取当前版本
get_current_version() {
    if [ -f "package.json" ]; then
        current_version=$(grep '"version"' package.json | cut -d'"' -f4)
        print_info "当前版本: $current_version"
    else
        print_error "未找到 package.json"
        exit 1
    fi
}

# 计算新版本
calculate_new_version() {
    local version_type=$1
    local current=$2
    
    # 分解版本号
    IFS='.' read -ra VERSION_PARTS <<< "$current"
    major=${VERSION_PARTS[0]}
    minor=${VERSION_PARTS[1]}
    patch=${VERSION_PARTS[2]}
    
    case $version_type in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch")
            patch=$((patch + 1))
            ;;
        *)
            print_error "无效的版本类型: $version_type"
            exit 1
            ;;
    esac
    
    new_version="$major.$minor.$patch"
    echo "$new_version"
}

# 更新版本号
update_version() {
    local new_version=$1
    
    print_info "更新版本号到 $new_version..."
    
    # 更新 package.json
    if command -v jq > /dev/null; then
        # 使用 jq 更新（更安全）
        jq ".version = \"$new_version\"" package.json > package.json.tmp
        mv package.json.tmp package.json
    else
        # 使用 sed 更新
        sed -i.bak "s/\"version\": \".*\"/\"version\": \"$new_version\"/" package.json
        rm package.json.bak
    fi
    
    print_success "版本号已更新"
}

# 运行测试
run_tests() {
    print_info "运行测试..."
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        print_info "安装依赖..."
        pnpm install
    fi
    
    # 运行 lint
    if pnpm lint > /dev/null 2>&1; then
        print_success "代码检查通过"
    else
        print_error "代码检查失败"
        exit 1
    fi
    
    # 运行类型检查
    if pnpm type-check > /dev/null 2>&1; then
        print_success "类型检查通过"
    else
        print_error "类型检查失败"
        exit 1
    fi
    
    # 运行测试
    if pnpm test > /dev/null 2>&1; then
        print_success "单元测试通过"
    else
        print_warning "单元测试失败，但继续发布"
    fi
    
    # 尝试构建
    if pnpm build > /dev/null 2>&1; then
        print_success "构建成功"
    else
        print_error "构建失败"
        exit 1
    fi
}

# 生成更新日志
generate_changelog() {
    local new_version=$1
    local last_tag=$2
    
    print_info "生成更新日志..."
    
    # 获取自上次标签以来的提交
    if [ -n "$last_tag" ]; then
        commits=$(git log --oneline "$last_tag"..HEAD)
    else
        commits=$(git log --oneline)
    fi
    
    if [ -n "$commits" ]; then
        echo "## 版本 $new_version ($(date +%Y-%m-%d))"
        echo ""
        echo "### 更新内容"
        echo ""
        echo "$commits" | while read -r line; do
            echo "- $line"
        done
        echo ""
    fi
}

# 创建 Git 标签
create_git_tag() {
    local new_version=$1
    local changelog=$2
    
    print_info "创建 Git 提交和标签..."
    
    # 提交版本更新
    git add package.json
    git commit -m "chore: bump version to $new_version"
    
    # 创建标签
    if [ -n "$changelog" ]; then
        git tag -a "v$new_version" -m "Release v$new_version

$changelog"
    else
        git tag -a "v$new_version" -m "Release v$new_version"
    fi
    
    print_success "Git 标签 v$new_version 已创建"
}

# 推送到远程
push_to_remote() {
    local new_version=$1
    
    print_info "推送到远程仓库..."
    
    # 推送提交
    git push origin HEAD
    
    # 推送标签
    git push origin "v$new_version"
    
    print_success "已推送到远程仓库"
}

# 显示发布信息
show_release_info() {
    local new_version=$1
    
    echo ""
    echo -e "${GREEN}🎉 版本 v$new_version 发布成功！${NC}"
    echo ""
    echo "📋 发布信息:"
    echo "  版本: v$new_version"
    echo "  分支: $(git branch --show-current)"
    echo "  提交: $(git rev-parse --short HEAD)"
    echo "  时间: $(date)"
    echo ""
    echo "🔗 相关链接:"
    echo "  GitHub Releases: https://github.com/your-username/flow-balance/releases"
    echo "  Docker Images: https://github.com/your-username/flow-balance/pkgs/container/flow-balance"
    echo ""
    echo "📦 Docker 镜像:"
    echo "  docker pull ghcr.io/your-username/flow-balance:v$new_version"
    echo "  docker pull ghcr.io/your-username/flow-balance:latest"
    echo ""
    echo "🚀 部署命令:"
    echo "  docker run -p 3000:3000 ghcr.io/your-username/flow-balance:v$new_version"
    echo ""
}

# 显示帮助
show_help() {
    echo "Flow Balance 版本发布脚本"
    echo ""
    echo "用法:"
    echo "  $0 <version_type>"
    echo ""
    echo "版本类型:"
    echo "  major  - 主版本号 (1.0.0 -> 2.0.0)"
    echo "  minor  - 次版本号 (1.0.0 -> 1.1.0)"
    echo "  patch  - 补丁版本 (1.0.0 -> 1.0.1)"
    echo ""
    echo "示例:"
    echo "  $0 patch   # 发布补丁版本"
    echo "  $0 minor   # 发布次版本"
    echo "  $0 major   # 发布主版本"
    echo ""
}

# 主函数
main() {
    local version_type=$1
    
    print_header
    
    # 检查参数
    if [ -z "$version_type" ]; then
        show_help
        exit 1
    fi
    
    if [ "$version_type" != "major" ] && [ "$version_type" != "minor" ] && [ "$version_type" != "patch" ]; then
        print_error "无效的版本类型: $version_type"
        show_help
        exit 1
    fi
    
    # 执行发布流程
    check_git_status
    get_current_version
    
    new_version=$(calculate_new_version "$version_type" "$current_version")
    print_info "新版本: $new_version"
    
    # 确认发布
    echo ""
    read -p "确认发布版本 v$new_version？(y/n): " confirm
    if [ "$confirm" != "y" ]; then
        print_info "发布已取消"
        exit 0
    fi
    
    # 执行发布步骤
    run_tests
    update_version "$new_version"
    
    # 获取最后一个标签
    last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    changelog=$(generate_changelog "$new_version" "$last_tag")
    
    create_git_tag "$new_version" "$changelog"
    push_to_remote "$new_version"
    
    show_release_info "$new_version"
    
    print_info "GitHub Actions 将自动构建和发布 Docker 镜像"
    print_info "请访问 GitHub Actions 页面查看构建状态"
}

# 运行主函数
main "$@"
