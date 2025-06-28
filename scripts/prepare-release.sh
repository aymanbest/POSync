#!/bin/bash

# Release preparation script for POSync
# This script helps prepare releases locally before pushing to GitHub

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_status "Current version: $CURRENT_VERSION"

# Check git status
if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes. Please commit or stash them first."
    git status --porcelain
    exit 1
fi

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_warning "You're not on the main branch (currently on: $CURRENT_BRANCH)"
    echo "It's recommended to create releases from the main branch."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Pull latest changes
print_status "Pulling latest changes..."
git pull origin "$CURRENT_BRANCH"

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Build the project
print_status "Building CSS..."
npm run build-css

print_status "Building React components..."
npm run build-react

print_status "Testing Electron build..."
npm run build

# Check if build succeeded
if [ $? -eq 0 ]; then
    print_success "Build completed successfully!"
else
    print_error "Build failed. Please fix the issues before creating a release."
    exit 1
fi

# Show build artifacts
print_status "Build artifacts created:"
if [ -d "dist" ]; then
    find dist -type f \( -name "*.exe" -o -name "*.dmg" -o -name "*.AppImage" -o -name "*.deb" \) -exec ls -lh {} \;
else
    print_warning "No dist directory found"
fi

# Ask for next version
echo
print_status "Version bump options:"
echo "1. Patch (${CURRENT_VERSION} → $(npm version patch --dry-run | sed 's/v//'))"
echo "2. Minor (${CURRENT_VERSION} → $(npm version minor --dry-run | sed 's/v//'))"
echo "3. Major (${CURRENT_VERSION} → $(npm version major --dry-run | sed 's/v//'))"
echo "4. Custom version"
echo "5. Skip version bump"

read -p "Choose an option (1-5): " VERSION_CHOICE

case $VERSION_CHOICE in
    1)
        NEW_VERSION=$(npm version patch --dry-run | sed 's/v//')
        VERSION_TYPE="patch"
        ;;
    2)
        NEW_VERSION=$(npm version minor --dry-run | sed 's/v//')
        VERSION_TYPE="minor"
        ;;
    3)
        NEW_VERSION=$(npm version major --dry-run | sed 's/v//')
        VERSION_TYPE="major"
        ;;
    4)
        read -p "Enter custom version (e.g., 1.2.3): " NEW_VERSION
        VERSION_TYPE="custom"
        ;;
    5)
        print_status "Skipping version bump"
        NEW_VERSION=$CURRENT_VERSION
        VERSION_TYPE="none"
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

if [ "$VERSION_TYPE" != "none" ]; then
    # Validate version format
    if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
        print_error "Invalid version format. Please use semantic versioning (e.g., 1.2.3)"
        exit 1
    fi

    print_status "Updating version to $NEW_VERSION..."
    npm version "$NEW_VERSION" --no-git-tag-version
fi

# Create changelog entry
print_status "Creating changelog entry..."
CHANGELOG_FILE="CHANGELOG.md"
DATE=$(date +"%Y-%m-%d")

# Create temp changelog
cat > temp_changelog.md << EOF
# Changelog

## [${NEW_VERSION}] - ${DATE}

EOF

# Append existing changelog if it exists
if [ -f "$CHANGELOG_FILE" ]; then
    # Skip the first line (# Changelog) from existing file
    tail -n +2 "$CHANGELOG_FILE" >> temp_changelog.md
fi

mv temp_changelog.md "$CHANGELOG_FILE"

print_success "Changelog updated. Please edit $CHANGELOG_FILE to add actual changes."

# Summary
echo
print_status "Release preparation summary:"
echo "- Current version: $CURRENT_VERSION"
echo "- New version: $NEW_VERSION"
echo "- Build: ✅ Successful"
echo "- Changelog: ✅ Created"
echo

print_status "Next steps:"
echo "1. Edit CHANGELOG.md to add actual changes"
echo "2. Commit the changes: git add . && git commit -m 'chore: prepare release $NEW_VERSION'"
echo "3. Create and push tag: git tag v$NEW_VERSION && git push origin main --tags"
echo "4. Or use the GitHub Actions 'Create Release Tag' workflow"

echo
print_success "Release preparation completed!"
