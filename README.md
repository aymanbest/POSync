# POSync - Point of Sale Application

A modern, cross-platform Point of Sale (POS) application built with Electron.js, React, and NeDB for reliable local data storage with optional sync capabilities.

## 🚀 Features

### Core Functionality
- **Offline-First Database**: Runs completely offline using NeDB as the local database
- **User Authentication**: Secure administrator login system with configurable credentials
- **Product Management**: Add, edit, delete products with categories, pricing, and stock tracking
- **Sales Processing**: Complete POS interface with barcode scanning, discounts, and multiple payment methods
- **Receipt System**: Generate and print customizable receipts with business branding
- **Transaction History**: Complete transaction management with search and filtering
- **Inventory Tracking**: Real-time stock level monitoring with low stock alerts
- **Reports & Analytics**: Comprehensive sales, inventory, and date-range reports with CSV export

### Advanced Features
- **Data Portability**: Export and import database functionality for backups and migration
- **Sync Capabilities**: Optional multi-device synchronization (configurable)
- **Customizable Settings**: Configure business details, tax rates, receipt templates, and more
- **Staff Management**: Multi-user support with role-based access
- **Barcode Integration**: Built-in barcode scanner support for quick product lookup

## 📋 System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 14.0 or higher
- **npm**: Version 6.0 or higher
- **Memory**: Minimum 4GB RAM recommended
- **Storage**: 500MB free disk space

## 🛠️ Installation & Setup

### Prerequisites

Ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (version 14 or higher)
- npm (comes with Node.js)

### Quick Start

1. **Download or Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/posync.git
   cd posync
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment (Optional)**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env file to customize settings (optional)
   ```

4. **Start the Application**
   ```bash
   npm start
   ```

The application will launch and automatically create the necessary database files on first run.

## 🔐 Default Login Credentials

**Important**: Change these credentials after first login!

- **Username**: `admin`
- **Password**: `admin`

Navigate to Settings → Staff Management to update the administrator password and add additional users.

## 💾 Database & Data Storage

POSync uses NeDB, a lightweight embedded database that stores data in JSON format. No external database server required!

### Database Location
- **Windows**: `%APPDATA%\posync\`
- **macOS**: `~/Library/Application Support/posync/`
- **Linux**: `~/.config/posync/`

### Data Backup
The application automatically creates backups during database operations. You can also manually export data via Settings → Data Management.

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and modify as needed:

```bash
# Basic Configuration
NODE_ENV=production
APP_NAME=POSync
APP_VERSION=1.1.1

# Database seeding (for development/testing only)
SEED_DATABASE=false

# Sync Server Configuration (optional)
START_SYNC_SERVER=false
SYNC_SERVER_PORT=3001
# SYNC_SERVER_URL=http://your-server:3001
```

### Application Settings

Most settings can be configured through the application interface:
- Business information and branding
- Tax rates and currency settings
- Receipt templates and printer configuration
- User accounts and permissions
- Stock level thresholds

## 🚀 Development

For detailed development information, see [CONTRIBUTING.md](CONTRIBUTING.md).

### Development Mode

Run the application in development mode with hot reloading:

```bash
npm run dev
```

This command will:
- Start Webpack in watch mode for React components
- Compile Tailwind CSS with watch mode
- Launch Electron with DevTools enabled

### Building for Production

Create platform-specific installers:

```bash
npm run build
```

Distribution packages will be created in the `dist/` folder.

## 📊 Usage Guide

### Getting Started

1. **First Launch**: The application will create default categories and optionally seed with sample data
2. **Login**: Use the default credentials (admin/admin) and change them immediately
3. **Configure Business**: Go to Settings → Business Details to set up your store information
4. **Add Products**: Navigate to Products to add your inventory
5. **Start Selling**: Use the POS interface to process sales

### Key Features

#### Point of Sale Interface
- Search products by name, SKU, or barcode
- Add items to cart with quantity adjustments
- Apply discounts (percentage or fixed amount)
- Process payments (cash, card, etc.)
- Generate and print receipts

#### Product Management
- Add/edit products with detailed information
- Organize products into categories
- Track stock levels with automatic updates
- Set up pricing and tax categories
- Import/export product data

#### Reports & Analytics
- **Sales Reports**: Track daily, weekly, monthly sales performance
- **Inventory Reports**: Monitor stock levels and product movement
- **Date Range Reports**: Analyze performance over custom periods
- **Export Data**: Download reports as CSV files for further analysis

#### Staff Management
- Create multiple user accounts
- Set role-based permissions
- Track user activity and sales performance

### Sync Features (Optional)

POSync includes optional synchronization capabilities for multi-device setups:

1. **Server Setup**: Configure one device as the sync server
2. **Client Setup**: Connect other devices to the sync server
3. **Automatic Sync**: Data synchronizes automatically across all connected devices

For detailed sync setup instructions and troubleshooting, see [SYNC_SYSTEM_README.md](SYNC_SYSTEM_README.md).

## 🛠️ Troubleshooting

### Common Issues

**Application won't start**
- Verify Node.js is installed correctly
- Check for conflicting processes on required ports
- Delete database files and restart for a fresh installation

**Database errors**
- Ensure sufficient disk space
- Check file permissions in the data directory
- Review logs in the application's data folder

**Sync issues**
- Verify network connectivity between devices
- Check firewall settings for the sync port
- Ensure all devices are using the same version

### Getting Help

- Check the logs in the application data directory
- Review error messages in the developer console (F12)
- Create an issue on the project repository with detailed error information
- Consult the [DEPLOYMENT.md](DEPLOYMENT.md) guide for production-specific troubleshooting

## 🔄 Version 1.1.1 Release Notes

For complete release history, see [CHANGELOG.md](CHANGELOG.md).

### What's New
- Improved database stability and migration handling
- Enhanced error handling and user feedback
- Updated environment configuration system
- Optimized performance for large inventories
- Better synchronization reliability

### Bug Fixes
- Fixed database initialization issues
- Resolved migration conflicts
- Improved receipt printing compatibility
- Enhanced data validation

## 📝 License

This project is licensed under the ISC License. See the LICENSE file for details.

## 📚 Documentation

This project includes comprehensive documentation to help you get started and contribute effectively:

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Complete contributor guidelines, development setup, and coding standards
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide for single-store and multi-location setups
- **[SYNC_SYSTEM_README.md](SYNC_SYSTEM_README.md)** - Detailed synchronization system documentation and setup guide
- **[CHANGELOG.md](CHANGELOG.md)** - Detailed release history and version notes
- **[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)** - Quality assurance and release verification checklist

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for detailed information on how to contribute.

### Quick Start for Contributors
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines
- Follow existing code style and patterns
- Test changes thoroughly before submitting
- Update documentation for new features
- Ensure backward compatibility when possible

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- UI powered by [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- Database by [NeDB](https://github.com/louischatriot/nedb)
- Charts by [Recharts](https://recharts.org/)

---

**POSync v1.1.1** - A reliable, offline-first POS solution for businesses of all sizes. 