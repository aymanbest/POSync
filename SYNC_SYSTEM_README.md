# RxDB Sync System Implementation

This document explains the RxDB sync system implemented for the POS application to enable synchronization between multiple machines.

## Overview

The sync system provides real-time synchronization between multiple POS machines using RxDB (Reactive Database) with PouchDB as the underlying storage and sync layer. This allows:

- **Multi-machine synchronization**: All POS machines can stay in sync with each other
- **Offline-first**: The system works offline and syncs when connection is restored
- **Conflict resolution**: Automatic conflict resolution using last-write-wins strategy
- **Real-time updates**: Changes are synchronized in real-time when online
- **Migration support**: Automatic migration from existing NeDB data

## Architecture

### Components

1. **RxDB Setup** (`src/db/rxdb-setup.js`)
   - Creates and configures the RxDB database
   - Defines collections with schemas
   - Provides helper methods for document operations

2. **Sync Server** (`src/db/sync-server.js`)
   - Standalone sync server using Express and PouchDB
   - Handles replication between multiple clients
   - Provides health check and monitoring endpoints

3. **Sync Manager** (`src/db/sync-manager.js`)
   - Manages replication between local database and sync server
   - Handles online/offline states
   - Implements retry logic and error handling

4. **Migration Utility** (`src/db/migration.js`)
   - Migrates existing NeDB data to RxDB format
   - Provides backup and restore functionality
   - Handles data transformation and validation

5. **Database Controller** (`src/controllers/db-controller.js`)
   - Updated to support both NeDB and RxDB
   - Provides backward compatibility during transition
   - Handles IPC communication with renderer process

### Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   POS Machine 1 │    │   Sync Server   │    │   POS Machine 2 │
│     (RxDB)      │◄──►│   (PouchDB)     │◄──►│     (RxDB)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local Storage │    │   Central DB    │    │   Local Storage │
│    (LevelDB)    │    │    (LevelDB)    │    │    (LevelDB)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Installation and Setup

### 1. Install Dependencies

The required dependencies are already added to `package.json`:

```bash
npm install
```

Key dependencies:
- `rxdb`: Reactive database
- `pouchdb`: Underlying storage and sync
- `express`: Sync server
- `express-pouchdb`: PouchDB HTTP interface

### 2. Environment Configuration

Create or update your `.env` file:

```env
# Enable sync server (for development/server machine)
START_SYNC_SERVER=true
SYNC_SERVER_PORT=3001

# Database seeding (optional)
SEED_DATABASE=false
```

### 3. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Usage

### Setting up Sync

1. **Server Machine Setup**:
   - Set `START_SYNC_SERVER=true` in `.env`
   - Start the application - it will automatically start the sync server
   - Note the server URL (e.g., `http://localhost:3001`)

2. **Client Machine Setup**:
   - Open Settings > Sync Settings
   - Enable sync and enter the server URL
   - Test the connection
   - Save settings

3. **Automatic Migration**:
   - If you have existing NeDB data, it will be automatically migrated to RxDB
   - Original data is backed up to `nedb-backup` folder

### Sync Features

- **Real-time Sync**: Changes are automatically synchronized when online
- **Offline Support**: Works offline, syncs when connection is restored
- **Conflict Resolution**: Uses last-write-wins strategy based on timestamps
- **Machine Identification**: Each machine has a unique ID for tracking changes
- **Sync Logging**: All sync operations are logged for monitoring

### Monitoring

Access the sync status through:
- **Settings Page**: Sync Settings section shows current status
- **Browser**: Visit `http://sync-server-url/api/stats` for server statistics
- **Health Check**: `http://sync-server-url/health` for server health

## API Reference

### IPC Handlers (Main Process)

```javascript
// Database operations
window.api.database.getStatus()           // Get sync status
window.api.database.updateSyncSettings() // Update sync configuration
window.api.database.forcePush()          // Force push local changes
window.api.database.forcePull()          // Force pull remote changes
window.api.database.getSyncLogs()        // Get sync operation logs

// All existing database operations work with both NeDB and RxDB
window.api.database.getProducts()        // Get products
window.api.database.addProduct()         // Add product
// ... etc
```

### Sync Server Endpoints

```
GET  /health                    # Health check
GET  /api/stats                 # Database statistics
GET  /api/machines              # Connected machines
POST /sync/{collection}/_bulk_docs # Bulk document operations
GET  /sync/{collection}/_changes   # Change feed
```

### RxDB Collections

Each collection has additional methods:

```javascript
// Products
await db.products.findByBarcode(barcode)
await db.products.findByCategory(categoryId)
await db.products.getLowStockProducts(threshold)

// Categories
await db.categories.findActive()

// Transactions
await db.transactions.findByReceiptId(receiptId)
await db.transactions.findByDateRange(start, end)
await db.transactions.findByTimeFrame(timeFrame)

// Users
await db.users.findByUsername(username)
await db.users.findActive()

// Settings
await db.settings.getSettings()
```

## Schemas

All documents include these common fields for sync:
- `_id`: Unique document identifier
- `createdAt`: Creation timestamp (ISO string)
- `updatedAt`: Last update timestamp (ISO string)
- `lastModified`: Last modification timestamp (number)
- `machineId`: ID of the machine that created/modified the document

## Conflict Resolution

The system uses a last-write-wins strategy:
1. Compare `lastModified` timestamps
2. The document with the higher timestamp wins
3. Conflicts are automatically resolved without user intervention
4. All sync operations are logged for audit purposes

## Troubleshooting

### Common Issues

1. **Migration Fails**:
   - Check console for error messages
   - Ensure sufficient disk space
   - Verify NeDB files are not corrupted

2. **Sync Not Working**:
   - Check network connectivity
   - Verify sync server is running
   - Check sync logs in Settings

3. **Performance Issues**:
   - Large datasets may take time to sync initially
   - Monitor sync logs for errors
   - Consider adjusting sync intervals

### Debug Mode

Enable debug logging by setting in the console:
```javascript
localStorage.debug = 'rxdb:*'
```

### Backup and Recovery

```javascript
// Export data
const backup = await window.api.database.exportData()

// Import data
await window.api.database.importData(backup)
```

## Security Considerations

- Sync server should be on a secure network
- Consider implementing authentication for production use
- Use HTTPS for remote sync servers
- Regularly backup sync server data

## Performance Optimization

- Use indexes on frequently queried fields
- Implement data cleanup policies
- Monitor sync performance and adjust batch sizes
- Consider sharding for very large datasets

## Future Enhancements

Potential improvements:
- User authentication and authorization
- Encrypted sync
- Selective sync (sync only specific collections)
- Advanced conflict resolution strategies
- Real-time collaboration features
- Sync analytics and reporting
