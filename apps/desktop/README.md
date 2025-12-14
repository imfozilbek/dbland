# @dbland/desktop

DBLand Desktop Application - React frontend for Tauri.

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **@dbland/ui** - Shared components

## Structure

```
src/
├── components/
│   └── layout/
│       ├── AppLayout.tsx    # Main layout
│       ├── Sidebar.tsx      # Navigation sidebar
│       ├── Toolbar.tsx      # Top toolbar
│       └── StatusBar.tsx    # Bottom status bar
├── pages/
│   ├── HomePage.tsx         # Landing page
│   ├── WorkspacePage.tsx    # Query workspace
│   └── SettingsPage.tsx     # Settings
├── App.tsx                  # Root component
└── main.tsx                 # Entry point
```

## Development

```bash
# Install dependencies
pnpm install

# Run dev server (React only)
pnpm dev

# Build
pnpm build

# Run with Tauri
pnpm dev:tauri
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm dev:tauri` | Start with Tauri |

## License

MIT
