# @dbland/web

DBLand Web Application - Browser-based database client.

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - Server state
- **Zustand** - Client state
- **React Router** - Routing
- **@dbland/ui** - Shared components
- **@dbland/core** - Business logic

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

# Run dev server
pnpm dev

# Build
pnpm build

# Preview production build
pnpm preview

# Run tests
pnpm test:run
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run tests once |

## License

MIT
