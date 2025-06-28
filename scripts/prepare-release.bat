@echo off
setlocal enabledelayedexpansion

REM Release preparation script for POSync (Windows version)
REM This script helps prepare releases locally before pushing to GitHub

echo [INFO] POSync Release Preparation Script
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Get current version
for /f "tokens=2 delims=:" %%i in ('findstr "version" package.json') do (
    set "version_line=%%i"
)
set "version_line=!version_line: =!"
set "version_line=!version_line:~1,-2!"
set "CURRENT_VERSION=!version_line!"

echo [INFO] Current version: !CURRENT_VERSION!

REM Check git status
git diff-index --quiet HEAD >nul 2>&1
if !errorlevel! neq 0 (
    echo [WARNING] You have uncommitted changes. Please commit or stash them first.
    git status --porcelain
    pause
    exit /b 1
)

REM Check current branch
for /f "tokens=*" %%i in ('git branch --show-current') do set "CURRENT_BRANCH=%%i"
if not "!CURRENT_BRANCH!"=="main" (
    echo [WARNING] You're not on the main branch ^(currently on: !CURRENT_BRANCH!^)
    echo It's recommended to create releases from the main branch.
    set /p "continue=Continue anyway? (y/N): "
    if /i not "!continue!"=="y" exit /b 1
)

REM Pull latest changes
echo [INFO] Pulling latest changes...
git pull origin !CURRENT_BRANCH!

REM Install dependencies
echo [INFO] Installing dependencies...
npm ci

REM Build the project
echo [INFO] Building CSS...
npm run build-css

echo [INFO] Building React components...
npm run build-react

echo [INFO] Testing Electron build...
npm run build

if !errorlevel! equ 0 (
    echo [SUCCESS] Build completed successfully!
) else (
    echo [ERROR] Build failed. Please fix the issues before creating a release.
    pause
    exit /b 1
)

REM Show build artifacts
echo [INFO] Build artifacts created:
if exist "dist" (
    dir /b dist\*.exe dist\*.dmg dist\*.AppImage dist\*.deb 2>nul
) else (
    echo [WARNING] No dist directory found
)

REM Ask for next version
echo.
echo [INFO] Version bump options:
echo 1. Patch ^(!CURRENT_VERSION! to next patch version^)
echo 2. Minor ^(!CURRENT_VERSION! to next minor version^)
echo 3. Major ^(!CURRENT_VERSION! to next major version^)
echo 4. Custom version
echo 5. Skip version bump

set /p "VERSION_CHOICE=Choose an option (1-5): "

if "!VERSION_CHOICE!"=="1" (
    set "VERSION_TYPE=patch"
) else if "!VERSION_CHOICE!"=="2" (
    set "VERSION_TYPE=minor"
) else if "!VERSION_CHOICE!"=="3" (
    set "VERSION_TYPE=major"
) else if "!VERSION_CHOICE!"=="4" (
    set /p "NEW_VERSION=Enter custom version (e.g., 1.2.3): "
    set "VERSION_TYPE=custom"
) else if "!VERSION_CHOICE!"=="5" (
    echo [INFO] Skipping version bump
    set "NEW_VERSION=!CURRENT_VERSION!"
    set "VERSION_TYPE=none"
) else (
    echo [ERROR] Invalid option
    pause
    exit /b 1
)

if not "!VERSION_TYPE!"=="none" (
    if not "!VERSION_TYPE!"=="custom" (
        REM Calculate new version based on type
        for /f "tokens=1,2,3 delims=." %%a in ("!CURRENT_VERSION!") do (
            set "major=%%a"
            set "minor=%%b"
            set "patch=%%c"
        )
        
        if "!VERSION_TYPE!"=="patch" (
            set /a "patch=!patch!+1"
            set "NEW_VERSION=!major!.!minor!.!patch!"
        ) else if "!VERSION_TYPE!"=="minor" (
            set /a "minor=!minor!+1"
            set "NEW_VERSION=!major!.!minor!.0"
        ) else if "!VERSION_TYPE!"=="major" (
            set /a "major=!major!+1"
            set "NEW_VERSION=!major!.0.0"
        )
    )
    
    echo [INFO] Updating version to !NEW_VERSION!...
    npm version !NEW_VERSION! --no-git-tag-version
)

REM Create changelog entry
echo [INFO] Creating changelog entry...
set "CHANGELOG_FILE=CHANGELOG.md"
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set "DATE=%%c-%%a-%%b"

REM Create temp changelog
(
echo # Changelog
echo.
echo ## [!NEW_VERSION!] - !DATE!
echo.
echo ### Added
echo - [Add new features here]
echo.
echo ### Changed
echo - [Add changes here]
echo.
echo ### Fixed
echo - [Add bug fixes here]
echo.
echo ### Removed
echo - [Add removed features here]
echo.
) > temp_changelog.md

REM Append existing changelog if it exists
if exist "!CHANGELOG_FILE!" (
    REM Skip the first line from existing file
    more +1 "!CHANGELOG_FILE!" >> temp_changelog.md
)

move temp_changelog.md "!CHANGELOG_FILE!" >nul

echo [SUCCESS] Changelog updated. Please edit !CHANGELOG_FILE! to add actual changes.

REM Summary
echo.
echo [INFO] Release preparation summary:
echo - Current version: !CURRENT_VERSION!
echo - New version: !NEW_VERSION!
echo - Build: ✅ Successful
echo - Changelog: ✅ Created
echo.

echo [INFO] Next steps:
echo 1. Edit CHANGELOG.md to add actual changes
echo 2. Commit the changes: git add . ^&^& git commit -m "chore: prepare release !NEW_VERSION!"
echo 3. Create and push tag: git tag v!NEW_VERSION! ^&^& git push origin main --tags
echo 4. Or use the GitHub Actions 'Create Release Tag' workflow
echo.

echo [SUCCESS] Release preparation completed!
pause
