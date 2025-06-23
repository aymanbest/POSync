# Contributing to POSync

Thank you for your interest in contributing to POSync! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

1. **Search existing issues** first to avoid duplicates
2. **Use the issue template** if available
3. **Include detailed information**:
   - Operating system and version
   - Node.js and npm versions
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Screenshots or error logs when relevant

### Suggesting Features

1. **Check the roadmap** in README.md to see if it's already planned
2. **Open a feature request** with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach
   - Any relevant mockups or examples

### Contributing Code

1. **Fork the repository**
2. **Create a feature branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Test thoroughly** on your target platform(s)
5. **Commit with clear messages**
6. **Push and create a pull request**

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 14+ (LTS recommended)
- **npm** 6+
- **Git**
- **Code editor** (VS Code recommended)

### Initial Setup

1. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/posync.git
   cd posync
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env as needed for development
   ```

4. **Start development mode**
   ```bash
   npm run dev
   ```

### Development Commands

- `npm start` - Start the application in production mode
- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build the application for production
- `npm run build-css` - Compile Tailwind CSS
- `npm test` - Run tests (when available)

## 📝 Coding Standards

### JavaScript/React

- **ES6+ syntax** preferred
- **Functional components** with hooks for React
- **Consistent naming**: camelCase for variables/functions, PascalCase for components
- **Meaningful variable names** and functions
- **Comments** for complex logic
- **Error handling** for all async operations

### File Organization

```
src/
├── components/          # React components
│   ├── ComponentName.jsx
│   └── shared/         # Reusable components
├── pages/              # Main application pages
├── controllers/        # Business logic and external integrations
├── db/                # Database setup and operations
├── utils/             # Utility functions
└── templates/         # HTML templates (receipts, etc.)
```

### Database Operations

- **Always handle errors** in database operations
- **Use transactions** for multi-step operations
- **Validate data** before database writes
- **Follow established patterns** in existing controllers

### Component Guidelines

- **Single responsibility** - one concern per component
- **Props validation** with PropTypes (when used)
- **Consistent styling** with Tailwind CSS classes
- **Accessibility** considerations (ARIA labels, keyboard navigation)

## 🧪 Testing

### Manual Testing

Before submitting a PR, test:

1. **Application startup** in both dev and production modes
2. **Core POS functionality**: add products, process sales, print receipts
3. **Database operations**: create, read, update, delete
4. **Error scenarios**: invalid inputs, network failures
5. **Cross-platform compatibility** (if possible)

### Test Data

- Use the `SEED_DATABASE=true` environment variable for consistent test data
- Test with both empty and populated databases
- Verify data migration scenarios

## 🎨 UI/UX Guidelines

### Design Principles

- **Simplicity**: Clean, uncluttered interface
- **Efficiency**: Minimize clicks for common operations
- **Accessibility**: Keyboard navigation, screen reader friendly
- **Responsiveness**: Works on different screen sizes
- **Consistency**: Follow established patterns

### Tailwind CSS

- Use **utility classes** instead of custom CSS when possible
- Follow the **color scheme** established in `tailwind.config.js`
- Use **responsive prefixes** for mobile compatibility
- Leverage **component classes** for repeated patterns

## 📋 Pull Request Process

### Before Submitting

1. **Rebase** your branch on the latest `main`
2. **Test thoroughly** on your development environment
3. **Update documentation** if your changes affect user-facing features
4. **Check for console errors** and warnings
5. **Verify** no unnecessary files are included

### PR Description

Include:
- **Summary** of changes
- **Motivation** behind the changes
- **Testing performed**
- **Screenshots** for UI changes
- **Breaking changes** (if any)
- **Related issues** (fixes #123)

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** on multiple platforms (when possible)
4. **Documentation** review
5. **Final approval** and merge

## 🔧 Technical Architecture

### Database Layer

- **NeDB** for primary data storage (lightweight, file-based)
- **RxDB** for advanced sync capabilities (optional)
- **Migration system** for schema changes
- **Backup/restore** functionality

### Application Structure

- **Main Process** (Electron): Window management, native APIs
- **Renderer Process**: React UI, user interactions
- **Controllers**: Business logic, database operations
- **IPC Communication**: Secure communication between processes

### Sync System

- **Optional feature** for multi-device setups
- **Conflict resolution** strategies
- **Network error handling**
- **Server/client architecture**

## 🚀 Release Process

### Version Numbering

Following [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Release Checklist

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Test on all target platforms
- [ ] Create release builds
- [ ] Tag the release
- [ ] Update documentation

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community discussions
- **Email**: For security-related issues only

### Development Questions

- Check existing **documentation** first
- Search **closed issues** for similar problems
- Ask **specific questions** with relevant context
- Include **error messages** and **environment details**

## 🙏 Recognition

Contributors will be:
- **Listed** in the README.md contributors section
- **Mentioned** in release notes for significant contributions
- **Credited** in the application's about section

## 📜 Code of Conduct

### Our Standards

- **Respectful** communication with all contributors
- **Constructive** feedback and discussions
- **Welcoming** environment for newcomers
- **Focus** on the project's success

### Enforcement

- Issues will be addressed promptly by maintainers
- Repeated violations may result in temporary or permanent bans
- Contact maintainers directly for serious concerns

---

## Quick Reference

### Common Tasks

**Add a new component:**
```bash
# Create component file
touch src/components/MyComponent.jsx

# Add to appropriate index or parent component
# Follow existing patterns for styling and structure
```

**Add a new database field:**
```bash
# Update schema in src/db/schemas.js
# Create migration in src/db/migration.js
# Test migration with sample data
```

**Add a new page:**
```bash
# Create page component in src/pages/
# Add route in main router component
# Update navigation if needed
```

### Useful Commands

```bash
# Reset development database
rm -rf ~/.config/posync/  # Linux/macOS
# or delete %APPDATA%\posync\ # Windows

# Debug Electron main process
npm run dev -- --inspect

# Build for specific platform
npm run build -- --win
npm run build -- --mac
npm run build -- --linux
```

Thank you for contributing to POSync! 🎉
