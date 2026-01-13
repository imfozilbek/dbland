---
name: brand-guidelines
description: DBLand brand identity - Dark dev tool theme for NoSQL database GUI client
---

# DBLand Brand Guidelines

## Brand Identity

**Product:** DBLand — NoSQL database agnostic GUI/WEB client
**Mood:** Professional, technical, powerful, developer-focused
**Theme:** Dev tool with syntax highlighting aesthetics

## Color Palette

### Dark Theme (Primary)

#### Background Colors
| Name | HEX | Usage |
|------|-----|-------|
| bg-primary | #0D1117 | Main background |
| bg-secondary | #161B22 | Panels, sidebars |
| bg-tertiary | #21262D | Cards, dropdowns |
| bg-elevated | #30363D | Hover states |

#### Border Colors
| Name | HEX | Usage |
|------|-----|-------|
| border-default | #30363D | Default borders |
| border-muted | #21262D | Subtle borders |
| border-emphasis | #8B949E | Emphasized borders |

#### Text Colors
| Name | HEX | Usage |
|------|-----|-------|
| text-primary | #E6EDF3 | Primary text |
| text-secondary | #8B949E | Secondary text |
| text-muted | #6E7681 | Muted text |
| text-link | #58A6FF | Links |

### Accent Colors
| Name | HEX | Usage |
|------|-----|-------|
| accent-blue | #58A6FF | Primary accent |
| accent-green | #3FB950 | Success, connected |
| accent-yellow | #D29922 | Warnings |
| accent-red | #F85149 | Errors, disconnected |
| accent-purple | #A371F7 | Special features |
| accent-orange | #DB6D28 | Highlights |

### Database Type Colors
| Database | Color | HEX |
|----------|-------|-----|
| MongoDB | Green | #00ED64 |
| Redis | Red | #DC382D |
| Elasticsearch | Yellow | #FEC514 |
| Cassandra | Blue | #1287B1 |

### Syntax Highlighting
| Token | Color | HEX |
|-------|-------|-----|
| keyword | Purple | #FF7B72 |
| string | Blue | #A5D6FF |
| number | Orange | #FFA657 |
| comment | Gray | #8B949E |
| operator | Red | #FF7B72 |
| property | Cyan | #79C0FF |
| value | Green | #7EE787 |

## Typography

| Element | Font | Fallback |
|---------|------|----------|
| UI text | Inter | system-ui, sans-serif |
| Code/Query | JetBrains Mono | SF Mono, Consolas, monospace |

### Code Font Settings
```css
font-family: 'JetBrains Mono', monospace;
font-size: 13px;
line-height: 1.5;
font-feature-settings: "liga" 1, "calt" 1;
```

## Usage Rules

1. **Dark theme primary** — Default to dark for developer comfort
2. **Syntax colors consistent** — Match popular editor themes
3. **Database colors respected** — Use official brand colors
4. **Monospace for data** — All query/result text in monospace
5. **High contrast** — Ensure readability in dark mode
6. **Minimal chrome** — Focus on data, not UI

## Button Styles

| Type | Background | Text | Border |
|------|------------|------|--------|
| Primary | accent-blue | white | none |
| Secondary | bg-tertiary | text-primary | border-default |
| Success | accent-green | white | none |
| Danger | accent-red | white | none |
| Ghost | transparent | text-secondary | none |

## Card Styles

```css
/* Panel */
background: #161B22;
border: 1px solid #30363D;
border-radius: 6px;

/* Query editor */
background: #0D1117;
border: 1px solid #30363D;
border-radius: 6px;
font-family: 'JetBrains Mono', monospace;

/* Results table */
background: #161B22;
border-collapse: collapse;
```

## Tree View (Schema Browser)

```css
/* Tree item */
padding: 4px 8px;
border-radius: 4px;

/* Tree item hover */
background: #21262D;

/* Tree item selected */
background: #30363D;
border-left: 2px solid #58A6FF;
```

## Connection Status

| Status | Color | Icon |
|--------|-------|------|
| Connected | #3FB950 | circle-check |
| Disconnected | #F85149 | circle-x |
| Connecting | #D29922 | loader |
| Error | #F85149 | alert-triangle |

## Query Editor

```css
/* Editor container */
background: #0D1117;
border: 1px solid #30363D;
border-radius: 6px;

/* Line numbers */
background: #161B22;
color: #6E7681;
padding-right: 16px;

/* Active line */
background: #161B22;
```

## Results Viewer

```css
/* Table header */
background: #21262D;
color: #8B949E;
font-weight: 600;

/* Table row */
border-bottom: 1px solid #21262D;

/* Table row hover */
background: #161B22;

/* JSON viewer */
font-family: 'JetBrains Mono', monospace;
```
