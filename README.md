# Electron POS Application

A cross-platform Point of Sale (POS) application built with Electron.js, React, and NeDB for local data storage.

## Features

- **Local Database**: Offline functionality using NeDB as the local database
- **Data Portability**: Export and import database functionality for backups and migration
- **User Authentication**: Secure administrator login system
- **Product & Category Management**: Add, edit, delete products and organize them into categories
- **Sales Processing**: Process transactions with discounts and multiple payment methods
- **Receipt Handling**: Generate and print customizable receipts
- **Transaction Management**: View and manage all transaction history
- **Settings & Customization**: Configure business details, tax rates, and more

## Current Status

The application is under active development. Here's what's currently implemented:

- ✅ Project structure and basic configuration
- ✅ Main Electron process with local database initialization
- ✅ Preload script for secure IPC communication
- ✅ User authentication system
- ✅ Dashboard component
- ✅ Product management component
- ✅ Category management component
- ✅ Transaction management component
- ✅ POS interface for sales processing
- ✅ Settings management
- ✅ Receipt template and printing functionality

## Installation

### Prerequisites

- Node.js (version 14 or higher)
- npm (version 6 or higher)

### Setup

1. Clone the repository:
```
git clone https://github.com/yourusername/electron-pos.git
cd electron-pos
```

2. Install dependencies:
```
npm install
```

3. Start the application:
```
npm start
```

## Development

Run the application in development mode:
```
npm run dev
```

This will start the application with DevTools enabled.

## Default Login

- Username: `admin`
- Password: `admin`

*Note: Change these credentials after the first login for security reasons.*

## Database

The application uses NeDB, a lightweight embedded database that stores data in JSON format. Database files are stored in the application's user data directory:

- Windows: `%APPDATA%\electron-pos\`
- macOS: `~/Library/Application Support/electron-pos/`
- Linux: `~/.config/electron-pos/`

## Building for Production

To build the application for production:

```
npm run build
```

This will create platform-specific packages in the `dist` folder.

## To-Do

- Add proper password hashing for user authentication
- Implement data export/import functionality
- Add user management for multiple user accounts
- Implement barcode scanner integration
- Create reports and analytics component
- Add multi-language support
- Implement keyboard shortcuts for improved efficiency

## License

This project is licensed under the ISC License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

# POS System Reports Module

## Installation Instructions

To integrate the new Reports component into your existing POS system, follow these steps:

1. First, install the required packages:

```bash
npm install recharts
```

2. Add the new Reports route to your router configuration. In your main router file (likely in App.jsx or similar), add:

```jsx
import Reports from './pages/Reports';

// Inside your Routes component:
<Route path="/reports" element={<Reports />} />
```

3. Add a link to the Reports page in your navigation menu:

```jsx
<Link to="/reports" className="nav-link">
  <i className="fas fa-chart-bar"></i>
  Reports
</Link>
```

## Features

The Reports module includes:

- **Sales Report**: View sales data with charts for different time periods
- **Date Range Report**: Analyze sales between custom dates with comparison options
- **Stock Products Report**: Track inventory levels and product stock status
- **CSV Export**: Export any report data to CSV for further analysis
- **Interactive Charts**: Visualize data with interactive charts using Recharts

## Report Types

### Sales Report
- View sales volume and revenue over time
- Filter by different time frames (day, week, month, year)
- See top-selling products with detailed breakdown

### Date Range Report
- Select custom date ranges for analysis
- Compare with previous periods
- Daily breakdown of sales and revenue

### Stock Products Report
- Monitor stock levels across your inventory
- Identify low stock and out-of-stock items
- View inventory value by product and category
- Sort and filter products by various criteria

## Customization

You can customize the reports by:
- Adjusting the low stock threshold in your settings
- Modifying the chart colors in the component files
- Adding additional metrics by extending the component logic 