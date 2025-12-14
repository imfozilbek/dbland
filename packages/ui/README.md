# @dbland/ui

Shared React UI components for DBLand applications.

Built with [Radix UI](https://radix-ui.com) primitives and [Tailwind CSS](https://tailwindcss.com).

## Installation

```bash
pnpm add @dbland/ui
```

## Components

### Base Components (24)

- **Alert** - Alert messages
- **AlertDialog** - Confirmation dialogs
- **Avatar** - User avatars
- **Badge** - Status badges
- **Button** - Action buttons
- **Card** - Content containers
- **Checkbox** - Checkboxes
- **Collapsible** - Collapsible sections
- **ContextMenu** - Right-click menus
- **Dialog** - Modal dialogs
- **DropdownMenu** - Dropdown menus
- **Input** - Text inputs
- **Label** - Form labels
- **Popover** - Popovers
- **ScrollArea** - Scrollable containers
- **Select** - Select dropdowns
- **Separator** - Visual separators
- **Sheet** - Slide-out panels
- **Skeleton** - Loading skeletons
- **Switch** - Toggle switches
- **Table** - Data tables
- **Tabs** - Tab navigation
- **Textarea** - Multiline inputs
- **Tooltip** - Tooltips

## Usage

```tsx
import { Button, Card, Input } from "@dbland/ui"

function MyComponent() {
    return (
        <Card>
            <Input placeholder="Enter text..." />
            <Button>Submit</Button>
        </Card>
    )
}
```

## Utilities

### cn() helper

Combines class names with Tailwind merge support:

```tsx
import { cn } from "@dbland/ui"

cn("px-4 py-2", isActive && "bg-blue-500", className)
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev
```

## License

MIT
