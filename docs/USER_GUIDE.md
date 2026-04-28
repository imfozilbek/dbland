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

Download the appropriate installer for your platform from the [Releases](https://github.com/imfozilbek/dbland/releases) page:

- **macOS**: Download the `.dmg` file and drag DBLand to your Applications folder
- **Windows**: Download the `.exe` installer and run it
- **Linux**: Download the `.deb` (Debian/Ubuntu) or `.AppImage` file

### First Launch

When you first launch DBLand, you'll see an empty connection list. Click the "New Connection" button to add your first database connection.

## Managing Connections

### Creating a Connection

1. Click the **+** button next to "Connections" in the sidebar (or the
   **New Connection** card on the Home page).
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

> **Format support:** JSON works end-to-end. CSV and BSON are listed as
> "Coming soon" in the format dropdown — the matching arms in the Rust
> backend return *not yet implemented*. Use JSON for now.

#### Import Data

1. Click "Import" button.
2. Select **JSON** as the file format.
3. Choose the file to import.
4. Select target database and collection.
5. Click "Import" — the dialog reports success or the backend error
   inline.

#### Export Data

1. Click "Export" button.
2. Select **JSON** as the file format.
3. Choose save location.
4. (Optional) Add a filter query (e.g. `{"status": "active"}`).
5. Click "Export" — the document count is reported inline when done.

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

> Only shortcuts wired through the workspace's `useKeyboardShortcuts`
> hook are listed below. Monaco's standard editor bindings (Find,
> Toggle comment, Multi-cursor, etc.) work inside the editor pane via
> Monaco itself.

### Workspace (when the query editor or workspace is focused)

- `Cmd+Enter` / `Ctrl+Enter`: Execute query
- `Cmd+S` / `Ctrl+S`: Save query (opens the Save Query dialog)
- `Cmd+Shift+F` / `Ctrl+Shift+F`: Format query

### Inside the Monaco editor

- `Cmd+F` / `Ctrl+F`: Find in editor (Monaco built-in)
- `Cmd+/` / `Ctrl+/`: Toggle comment
- `Cmd+D` / `Ctrl+D`: Add cursor at next match
- Press `F1` for Monaco's full command palette

> Tab navigation, "New connection", "Open settings" and "Quit" do not
> have global hotkeys yet — track them on
> [GitHub Issues](https://github.com/imfozilbek/dbland/issues) if you
> rely on them.

## Settings

Click the **Settings** entry at the bottom of the sidebar.

### General

- **Theme**: Light, Dark, or System
- **Language**: Interface language (English / Russian — i18n is wired
  in the store, copy isn't translated yet)
- **Auto-save queries**: Auto-save queries on execution
- **Confirm before delete**: Show a confirmation dialog for destructive
  actions

### Editor

- **Font Size**: 10–24px
- **Tab Size**: 2–8 spaces
- **Word Wrap**: Toggle word wrapping
- **Show Minimap**: Toggle Monaco's minimap overlay

### About

- App version, grouped feature list, and a "Reset to defaults" button
  (clears preferences only; saved connections stay).

> Auto-updater runs through Tauri's plugin and pulls signed releases
> from GitHub Releases. There's no separate "Check for Updates" tab in
> Settings — the updater dialog appears when an update is available.

## Tips & Tricks

1. **Format Query**: Press `Cmd+Shift+F` / `Ctrl+Shift+F` to auto-format
   your query.
2. **Connection String**: Paste a full URI into the **Advanced** tab of
   the connection dialog and click the parse arrow — the Basic fields
   populate from the URI. The eye toggle hides / reveals the password.
3. **SSH Tunneling**: All three SSH auth methods (password, key file,
   agent) are supported — pick the one your server expects in the
   **SSH** tab of the connection dialog.
4. **Theme follows OS**: DBLand picks Light / Dark from the OS by
   default. Override in Settings → General → Theme.
5. **Aggregation Pipelines**: Drag $match / $group / $project and
   friends from the Stage Library into the canvas; click "Show Code"
   to see the generated `db.collection.aggregate(...)` snippet.
6. **Document edit modes**: The edit dialog has both Form and JSON
   modes — switch via the tabs at the top.

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

- **Issues**: Report bugs at [GitHub Issues](https://github.com/imfozilbek/dbland/issues)
- **Discussions**: Join the community at [GitHub Discussions](https://github.com/imfozilbek/dbland/discussions)

## License

DBLand is open-source software licensed under the MIT License.
