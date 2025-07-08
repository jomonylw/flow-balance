#!/bin/bash

# Flow Balance - Version Manager
# 版本号管理和 Docker 镜像构建脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_header() {
    echo -e "${BLUE}🏷️  Flow Balance - Version Manager${NC}"
    echo -e "${BLUE}====================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  current           显示当前版本信息"
    echo "  bump [type]       升级版本号 (patch|minor|major)"
    echo "  tag               创建 Git 标签并推送"
    echo "  docker-tags       显示 Docker 镜像标签策略"
    echo "  release [type]    完整发布流程 (patch|minor|major)"
    echo ""
    echo "示例:"
    echo "  $0 current                    # 显示当前版本"
    echo "  $0 bump patch                 # 升级补丁版本 (1.0.0 -> 1.0.1)"
    echo "  $0 bump minor                 # 升级次版本 (1.0.0 -> 1.1.0)"
    echo "  $0 bump major                 # 升级主版本 (1.0.0 -> 2.0.0)"
    echo "  $0 release patch              # 完整发布流程"
    echo ""
}

# 获取当前版本
get_current_version() {
    if [ -f "package.json" ]; then
        node -p "require('./package.json').version" 2>/dev/null || echo "unknown"
    else
        echo "unknown"
    fi
}

# 显示当前版本信息
show_current_version() {
    local current_version=$(get_current_version)
    local git_commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local git_tag=$(git describe --tags --exact-match 2>/dev/null || echo "none")
    
    print_info "当前版本信息:"
    echo "  📦 Package Version: $current_version"
    echo "  🔗 Git Commit: $git_commit"
    echo "  🏷️  Git Tag: $git_tag"
    echo ""
    
    print_info "Docker 镜像标签策略:"
    echo "  🐳 ghcr.io/jomonylw/flow-balance:latest"
    echo "  🐳 ghcr.io/jomonylw/flow-balance:$current_version"
    echo "  🐳 ghcr.io/jomonylw/flow-balance:v$current_version"
    echo ""
}

# 计算新版本号
calculate_new_version() {
    local version_type=$1
    local current_version=$2
    
    # 解析当前版本号
    local major=$(echo "$current_version" | cut -d. -f1)
    local minor=$(echo "$current_version" | cut -d. -f2)
    local patch=$(echo "$current_version" | cut -d. -f3)
    
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
    
    echo "$major.$minor.$patch"
}

# 更新 package.json 版本号
update_package_version() {
    local new_version=$1
    
    print_info "更新 package.json 版本号到 $new_version..."
    
    # 使用 node 脚本更新版本号
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.version = '$new_version';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
        console.log('✅ package.json 版本号已更新');
    "
}

# 升级版本号
bump_version() {
    local version_type=$1
    
    if [ -z "$version_type" ]; then
        print_error "请指定版本类型: patch, minor, major"
        exit 1
    fi
    
    local current_version=$(get_current_version)
    local new_version=$(calculate_new_version "$version_type" "$current_version")
    
    print_info "版本升级: $current_version -> $new_version"
    
    # 确认升级
    read -p "确认升级版本号？(y/n): " confirm
    if [ "$confirm" != "y" ]; then
        print_info "版本升级已取消"
        exit 0
    fi
    
    update_package_version "$new_version"
    print_success "版本号已升级到 $new_version"
}

# 创建 Git 标签
create_git_tag() {
    local version=$(get_current_version)
    local tag_name="v$version"
    
    print_info "创建 Git 标签 $tag_name..."
    
    # 检查是否有未提交的更改
    if ! git diff --quiet; then
        print_warning "检测到未提交的更改，正在提交..."
        git add package.json
        git commit -m "chore: bump version to $version"
    fi
    
    # 创建标签
    git tag -a "$tag_name" -m "Release $tag_name

🚀 Flow Balance Release $tag_name

### 📦 Docker Images

\`\`\`bash
# 拉取最新镜像
docker pull ghcr.io/jomonylw/flow-balance:$version
docker pull ghcr.io/jomonylw/flow-balance:latest

# 运行容器
docker run -p 3000:3000 ghcr.io/jomonylw/flow-balance:$version
\`\`\`

### 🔧 部署说明

详见项目文档中的部署指南。
"
    
    print_success "Git 标签 $tag_name 已创建"
    
    # 推送标签
    read -p "是否推送标签到远程仓库？(y/n): " push_confirm
    if [ "$push_confirm" = "y" ]; then
        git push origin HEAD
        git push origin "$tag_name"
        print_success "标签已推送到远程仓库"
        print_info "GitHub Actions 将自动构建 Docker 镜像"
    fi
}

# 显示 Docker 标签策略
show_docker_tags() {
    local current_version=$(get_current_version)
    
    print_info "Docker 镜像标签策略:"
    echo ""
    echo "📋 自动生成的标签:"
    echo "  🔄 main 分支推送:"
    echo "    - ghcr.io/jomonylw/flow-balance:latest"
    echo "    - ghcr.io/jomonylw/flow-balance:$current_version"
    echo "    - ghcr.io/jomonylw/flow-balance:v$current_version"
    echo ""
    echo "  🏷️  标签推送 (v1.2.3):"
    echo "    - ghcr.io/jomonylw/flow-balance:1.2.3"
    echo "    - ghcr.io/jomonylw/flow-balance:1.2"
    echo "    - ghcr.io/jomonylw/flow-balance:1"
    echo "    - ghcr.io/jomonylw/flow-balance:latest"
    echo ""
    echo "  🌿 分支推送:"
    echo "    - ghcr.io/jomonylw/flow-balance:develop"
    echo "    - ghcr.io/jomonylw/flow-balance:feature-xxx"
    echo ""
    echo "📦 支持的平台:"
    echo "  - linux/amd64"
    echo "  - linux/arm64"
    echo ""
}

# 完整发布流程
release() {
    local version_type=$1
    
    if [ -z "$version_type" ]; then
        print_error "请指定版本类型: patch, minor, major"
        exit 1
    fi
    
    print_info "开始完整发布流程..."
    
    # 1. 升级版本号
    bump_version "$version_type"
    
    # 2. 创建标签并推送
    create_git_tag
    
    print_success "发布流程完成！"
    print_info "请访问 GitHub Actions 查看构建状态:"
    print_info "https://github.com/jomonylw/flow-balance/actions"
}

# 主函数
main() {
    local command=$1
    
    print_header
    
    case $command in
        "current")
            show_current_version
            ;;
        "bump")
            bump_version "$2"
            ;;
        "tag")
            create_git_tag
            ;;
        "docker-tags")
            show_docker_tags
            ;;
        "release")
            release "$2"
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
