# DBLand User Guide

Welcome to DBLand! This guide will help you get started with managing your NoSQL databases.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Managing Connections](#managing-connections)
3. [Working with MongoDB](#working-with-mongodb)
4. [Working with Redis](#working-with-redis)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Settings](#settings)

## Getting Started

### Installation

Download the appropriate installer for your platform from the [Releases](https://github.com/samiyev/dbland/releases) page:

- **macOS**: Download the `.dmg` file and drag DBLand to your Applications folder
- **Windows**: Download the `.exe` installer and run it
- **Linux**: Download the `.deb` (Debian/Ubuntu) or `.AppImage` file

### First Launch

When you first launch DBLand, you'll see an empty connection list. Click the "New Connection" button to add your first database connection.

## Managing Connections

### Creating a Connection

1. Click the "New Connection" button or press `Cmd+N` (Mac) / `Ctrl+N` (Windows/Linux)
2. Fill in the connection details in the **Basic** tab:
   - **Name**: A friendly name for this connection
   - **Type**: MongoDB or Redis
   - **Host**: Database server address (default: localhost)
   - **Port**: Database port (default: 27017 for MongoDB, 6379 for Redis)
   - **Username**: (Optional) Authentication username
   - **Password**: (Optional) Authentication password

3. **(Optional)** Configure SSH tunnel in the **SSH** tab:
   - Enable SSH tunnel
   - Enter SSH host and port
   - Choose authentication method:
     - **Password**: Enter SSH password
     - **Private Key**: Provide path to private key file
     - **Agent**: Use SSH agent

4. **(Optional)** Configure SSL/TLS in the **SSL/TLS** tab
5. **(Optional)** Use the **Advanced** tab to paste a connection string

6. Click "Test Connection" to verify the connection works
7. Click "Save" to store the connection

### Editing a Connection

- Right-click on a connection and select "Edit"
- Or click the edit icon next to the connection name

### Deleting a Connection

- Right-click on a connection and select "Delete"
- Confirm the deletion

### Connecting to a Database

- Click on a connection in the sidebar to connect
- The connection status will change to "Connected"
- You can now browse databases and collections

## Working with MongoDB

### Query Editor

1. Select a database and collection from the tree
2. The query editor will open automatically
3. Type your MongoDB query (e.g., `db.users.find({ age: { $gt: 18 } })`)
4. Press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows/Linux) to execute
5. Results appear in the results viewer below

#### Query Examples

```javascript
// Find all documents
db.collection.find({})

// Find with filter
db.collection.find({ status: "active" })

// Find with projection
db.collection.find({}, { name: 1, email: 1 })

// Count documents
db.collection.countDocuments({ status: "active" })

// Insert document
db.collection.insertOne({ name: "John", age: 30 })

// Update document
db.collection.updateOne(
    { name: "John" },
    { $set: { age: 31 } }
)

// Delete document
db.collection.deleteOne({ name: "John" })
```

### Results Viewer

The results viewer has three modes:

- **Table**: View results in a tabular format (default)
- **JSON**: View raw JSON output
- **Tree**: View documents in an expandable tree structure

Switch modes using the tabs at the top of the results panel.

### Query History

- All executed queries are automatically saved
- Access query history from the History panel
- Click on a query to load it into the editor
- Search queries using the search box

### Saved Queries

1. Write a query in the editor
2. Click "Save Query" button
3. Enter a name, description, and tags
4. Click "Save"
5. Access saved queries from the Saved Queries panel

### Document Operations

#### View Document

- Click on any document in the results table
- The document will open in the document viewer

#### Edit Document

1. Right-click on a document in the results table
2. Select "Edit"
3. Choose **Form** or **JSON** editing mode
4. Make your changes
5. Click "Save"

#### Create Document

1. Click the "New Document" button
2. Enter document data in Form or JSON mode
3. Click "Save"

#### Clone Document

1. Right-click on a document
2. Select "Clone"
3. Modify the cloned document
4. Click "Save"

#### Delete Document

1. Right-click on a document
2. Select "Delete"
3. Confirm the deletion

### Import/Export

#### Import Data

1. Click "Import" button
2. Select file format (JSON, CSV, BSON)
3. Choose the file to import
4. Select target database and collection
5. For CSV files, map fields to document properties
6. Click "Import"
7. Monitor progress in the progress bar

#### Export Data

1. Click "Export" button
2. Select file format (JSON, CSV, BSON)
3. Choose save location
4. (Optional) Add a query filter
5. Click "Export"

### Aggregation Pipeline

1. Click "Aggregation" button
2. Drag stages from the library to the canvas
3. Configure each stage (e.g., $match, $group, $project)
4. Preview intermediate results
5. Click "Execute" to run the pipeline
6. Switch to "Code" tab to see the generated pipeline

Supported stages:
- $match
- $group
- $project
- $sort
- $limit
- $skip
- $lookup
- $unwind
- $addFields
- $count

### Index Management

1. Select a collection
2. Click "Indexes" tab
3. View all indexes with statistics
4. Click "Create Index" to add a new index
5. Choose fields and index options:
   - Unique
   - Sparse
   - TTL
   - Background
6. Click "Create"

To drop an index, click the trash icon next to it.

## Working with Redis

### Key Browser

1. Enter a pattern in the search box (e.g., `user:*`, `session:*`)
2. Click Search or press Enter
3. Click on a key to view its value

### Data Viewers

DBLand automatically detects the data type of each key and displays it appropriately:

- **String**: Plain text viewer
- **List**: Indexed list of values
- **Set**: Unordered set of unique values
- **Hash**: Field-value pairs
- **Sorted Set (ZSet)**: Members with scores

### TTL Management

1. Select a key
2. View current TTL at the top (or "No expiration")
3. Enter new TTL value in seconds
4. Click "Set" to update

### Slow Log

1. Click "Slow Log" tab
2. View slow queries with:
   - Execution time
   - Timestamp
   - Command
3. Click "Refresh" to update

## Keyboard Shortcuts

### Global

- `Cmd+N` / `Ctrl+N`: New Connection
- `Cmd+W` / `Ctrl+W`: Close Tab
- `Cmd+,` / `Ctrl+,`: Open Settings
- `Cmd+Q` / `Ctrl+Q`: Quit

### Query Editor

- `Cmd+Enter` / `Ctrl+Enter`: Execute Query
- `Cmd+S` / `Ctrl+S`: Save Query
- `Cmd+F` / `Ctrl+F`: Find in Editor
- `Cmd+/` / `Ctrl+/`: Toggle Comment

### Navigation

- `Cmd+1-9` / `Ctrl+1-9`: Switch to Tab 1-9
- `Cmd+[` / `Ctrl+[`: Previous Tab
- `Cmd+]` / `Ctrl+]`: Next Tab

## Settings

Access settings via `Cmd+,` (Mac) / `Ctrl+,` (Windows/Linux) or from the menu.

### General

- **Language**: Choose interface language
- **Theme**: Light, Dark, or System
- **Auto-save**: Auto-save queries on execution

### Editor

- **Font Size**: Adjust editor font size (12-24px)
- **Tab Size**: Set indentation size (2 or 4 spaces)
- **Word Wrap**: Enable/disable word wrapping

### Updates

- **Check for Updates**: Manually check for new versions
- **Auto-update**: Enable automatic updates

## Tips & Tricks

1. **Quick Connect**: Double-click a connection to connect instantly
2. **Format Query**: Use `Cmd+Shift+F` to auto-format your query
3. **Explain Query**: View query execution plan with "Explain" button
4. **Dark Mode**: DBLand supports system-wide dark mode preferences
5. **Connection String**: Paste a full connection string in the Advanced tab for quick setup
6. **SSH Tunneling**: Use SSH tunneling to securely connect to remote databases
7. **Batch Operations**: Use aggregation pipelines for complex data transformations

## Troubleshooting

### Can't Connect to Database

1. Verify host and port are correct
2. Check if database server is running
3. Verify username and password
4. Check firewall settings
5. Try connecting via SSH tunnel if remote

### Query Not Executing

1. Check query syntax
2. Verify you're connected to the database
3. Check console for error messages
4. Try a simpler query to isolate the issue

### Import/Export Fails

1. Verify file format is correct
2. Check file permissions
3. Ensure sufficient disk space
4. Verify database connection is active

## Getting Help

- **Documentation**: Visit [docs.dbland.app](https://docs.dbland.app)
- **Issues**: Report bugs at [GitHub Issues](https://github.com/samiyev/dbland/issues)
- **Discussions**: Join the community at [GitHub Discussions](https://github.com/samiyev/dbland/discussions)

## License

DBLand is open-source software licensed under the MIT License.
