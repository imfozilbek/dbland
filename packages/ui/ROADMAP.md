# @dbland/ui Roadmap

> Current version: **1.1.0**. The milestones below describe the original
> build-up to v1.0.0; everything listed here has shipped.

## v0.1.0 - Base Components

**Status:** ✅ Completed

- [x] Base UI components (Radix-based, 24+ components)
- [x] DBLand brand theming
- [x] Tailwind config

---

## v0.2.0 - Layout Components

**Status:** ✅ Completed

- [x] ResizablePanel (`react-resizable-panels`)
- [x] Tabs / TabsList / TabsTrigger
- [x] Sheet / Dialog primitives

---

## v0.3.0 - Tree Components

**Status:** ✅ Completed

- [x] Tree
- [x] TreeNode (used by Schema Browser and Results Tree)

---

## v0.4.0 - Query Editor

**Status:** ✅ Completed

- [x] Monaco integration
- [x] MongoDB syntax highlighting
- [x] Redis syntax highlighting
- [x] Autocomplete provider

---

## v0.5.0 - Results Viewer

**Status:** ✅ Completed

- [x] TableView (with `@tanstack/react-virtual`)
- [x] JsonView
- [x] TreeView
- [x] DocumentView

---

## v0.6.0 - Specialized Components

**Status:** ✅ Completed

- [x] ConnectionForm (`ConnectionManagerDialog`)
- [x] SSHConfigForm
- [x] DocumentEditorDialog
- [x] AggregationStage (`StageEditor` + `SortableStageCard`)
- [x] IndexCard (`IndexManager`)

---

## v1.1.0 — additions

- [x] DatabaseProfiler, CollectionStats, GeospatialQueryBuilder,
      GridFSBrowser, ReplicaSetMonitor, ShardingDashboard
- [x] `useConfirm()` hook backed by Radix `<AlertDialog>`
- [x] `sonner` Toaster re-exported from the package
- [x] Brand-aligned tokens (Inter, JetBrains Mono, GitHub-dark palette)
