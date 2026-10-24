# INV GENERATE Design System

A professional design system for offline billing applications built with React, Next.js, and Tailwind CSS.

## 🎨 Philosophy

- **Professional**: Clean, minimal, enterprise-grade appearance
- **Accessible**: WCAG compliant colors and spacing
- **Consistent**: Unified typography, spacing, and component library
- **Performant**: Optimized for desktop applications
- **Scalable**: Easy to extend and maintain

---

## 📝 Typography

### Font Families

| Font | Usage | CSS Variable |
|------|-------|--------------|
| **Inter** | UI text, headings, body copy | `--font-inter` |
| **JetBrains Mono** | Numbers, codes, invoice IDs | `--font-mono` |

### Font Sizes

| Class | Size | Usage | CSS Variable |
|-------|------|-------|--------------|
| `text-xs` | 12px | Captions, small labels | `--text-xs` |
| `text-sm` | 14px | Body small, form labels | `--text-sm` |
| `text-base` | 16px | Body text, inputs | `--text-base` |
| `text-lg` | 18px | Large body, buttons | `--text-lg` |
| `text-xl` | 20px | Subheadings | `--text-xl` |
| `text-2xl` | 24px | Section headings | `--text-2xl` |
| `text-3xl` | 30px | Page headings | `--text-3xl` |
| `text-4xl` | 36px | Major headings | `--text-4xl` |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Light | 300 | Subtle text |
| Normal | 400 | Body text |
| Medium | 500 | Emphasis |
| Semibold | 600 | Headings |
| Bold | 700 | Strong emphasis |

### Typography Classes

```tsx
// Headings
<h1 className="text-display">Page Title</h1>        // 36px, bold
<h2 className="text-heading-1">Section Title</h2>   // 30px, semibold
<h3 className="text-heading-2">Subsection</h3>      // 24px, semibold
<h4 className="text-heading-3">Component Title</h4> // 20px, medium

// Body Text
<p className="text-body-lg">Large body text</p>    // 18px, normal
<p className="text-body">Regular body text</p>     // 16px, normal
<p className="text-body-sm">Small body text</p>    // 14px, normal
<p className="text-caption">Caption text</p>       // 12px, muted

// Numbers & Codes
<span className="text-mono">INV-001</span>         // Monospace, medium
<span className="text-mono-lg">$1,234.56</span>    // Large monospace
<span className="text-mono-sm">001</span>          // Small monospace
```

---

## 🎨 Color System

### Neutral Scale (High Contrast)

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#fafafa` | Lightest backgrounds |
| 100 | `#f5f5f5` | Card backgrounds |
| 200 | `#e5e5e5` | Borders, dividers |
| 300 | `#d4d4d4` | Muted elements |
| 400 | `#a3a3a3` | Disabled states |
| 500 | `#737373` | Secondary text |
| 600 | `#525252` | Body text |
| 700 | `#404040` | Headings |
| 800 | `#262626` | Strong text |
| 900 | `#171717` | Darkest text |

### Primary Colors (Professional Blue)

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#eff6ff` | Lightest primary |
| 100 | `#dbeafe` | Primary backgrounds |
| 200 | `#bfdbfe` | Hover states |
| 300 | `#93c5fd` | Active states |
| 400 | `#60a5fa` | Interactive elements |
| 500 | `#3b82f6` | Primary buttons |
| 600 | `#2563eb` | Primary hover |
| 700 | `#1d4ed8` | Primary active |
| 800 | `#1e40af` | Primary dark |
| 900 | `#1e3a8a` | Darkest primary |

### Semantic Colors

| Color | Background | Text | Usage |
|-------|------------|------|-------|
| Success | `#f0fdf4` | `#22c55e` | Positive actions, confirmations |
| Warning | `#fffbeb` | `#f59e0b` | Warnings, cautions |
| Danger | `#fef2f2` | `#ef4444` | Errors, destructive actions |

### Color Usage

```tsx
// Primary actions
<button className="bg-primary-500 hover:bg-primary-600 text-white">
  Save Invoice
</button>

// Status indicators
<div className="bg-success-50 text-success-700 px-2 py-1 rounded">
  ✓ Paid
</div>

<div className="bg-warning-50 text-warning-700 px-2 py-1 rounded">
  ⚠ Pending
</div>

<div className="bg-danger-50 text-danger-700 px-2 py-1 rounded">
  ✗ Overdue
</div>

// Neutral text hierarchy
<h1 className="text-neutral-900">Page Title</h1>
<p className="text-neutral-700">Body text</p>
<span className="text-neutral-500">Secondary info</span>
```

---

## 📏 Spacing System

### Spacing Scale

| Class | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Minimal gaps |
| `space-2` | 8px | Small gaps, padding |
| `space-3` | 12px | Form elements |
| `space-4` | 16px | Component padding |
| `space-5` | 20px | Section spacing |
| `space-6` | 24px | Container padding |
| `space-8` | 32px | Large sections |
| `space-10` | 40px | Major sections |
| `space-12` | 48px | Page sections |
| `space-16` | 64px | Layout spacing |
| `space-20` | 80px | Page margins |
| `space-24` | 96px | Large layouts |

### Spacing Examples

```tsx
// Component spacing
<div className="p-6 space-y-4">  {/* 24px padding, 16px gaps */}
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Layout spacing
<div className="container-app space-y-8">  {/* 32px vertical spacing */}
  <section>Section 1</section>
  <section>Section 2</section>
</div>

// Form spacing
<form className="space-y-6 p-6">  {/* 24px gaps, 24px padding */}
  <input className="w-full p-3" />  {/* 12px input padding */}
  <button className="px-4 py-2">Submit</button>
</form>
```

---

## 🧩 Component Library

### Buttons

```tsx
// Primary button
<button className="btn-primary">
  Create Invoice
</button>

// Secondary button
<button className="btn-secondary">
  Cancel
</button>

// Success button
<button className="btn-success">
  Save Changes
</button>

// Danger button
<button className="btn-danger">
  Delete Invoice
</button>
```

### Forms

```tsx
// Input field
<input
  type="text"
  className="input"
  placeholder="Enter invoice number"
/>

// Select dropdown
<select className="input select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Cards

```tsx
// Basic card
<div className="card">
  <h3 className="text-heading-3 mb-4">Invoice Summary</h3>
  <p className="text-body">Total: <span className="text-mono">$1,234.56</span></p>
</div>

// Card with header
<div className="card">
  <div className="card-header">
    <h3 className="text-heading-3">Customer Details</h3>
  </div>
  <div className="space-y-2">
    <p>Name: John Doe</p>
    <p>Email: john@example.com</p>
  </div>
</div>
```

### Layout

```tsx
// App container
<div className="container-app">
  <h1 className="text-display mb-8">Dashboard</h1>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div className="card">
      <h3 className="text-heading-3">Total Sales</h3>
      <p className="text-mono-lg text-primary-600">$12,345.67</p>
    </div>
    {/* More cards... */}
  </div>
</div>

// Flex utilities
<div className="flex-between">
  <h2 className="text-heading-2">Invoices</h2>
  <button className="btn-primary">New Invoice</button>
</div>
```

---

## 🎯 Usage Guidelines

### Do's ✅

- Use Inter for all UI text and JetBrains Mono for numbers
- Maintain consistent spacing using the scale
- Use semantic colors for status and actions
- Ensure 4.5:1 contrast ratio for accessibility
- Use minimal shadows for depth

### Don'ts ❌

- Don't use gradients
- Don't mix font families inappropriately
- Don't use colors outside the palette
- Don't create custom spacing values
- Don't use heavy shadows or effects

### Accessibility

- All text meets WCAG AA contrast requirements
- Focus states are clearly visible
- Interactive elements have appropriate sizing (44px minimum)
- Color is never the only indicator of state

---

## 🔧 Technical Implementation

### CSS Variables

All design tokens are available as CSS variables:

```css
/* Typography */
--font-inter: 'Inter', ...;
--text-base: 1rem;

/* Colors */
--primary-500: #3b82f6;
--neutral-700: #404040;

/* Spacing */
--space-4: 1rem;
--border-radius: 6px;
```

### Tailwind Extensions

Custom utilities are available:

```tsx
// Typography utilities
<div className="text-display">Large heading</div>
<div className="text-mono">$1,234.56</div>

// Component utilities
<button className="btn-primary">Click me</button>
<div className="card">Content</div>
<input className="input" />
```

### Font Loading

Fonts are loaded via `@font-face` with `font-display: swap` for performance.

---

## 📊 Performance Notes

- Variable fonts reduce bundle size
- CSS variables enable runtime theming
- Minimal CSS footprint (no unused styles)
- Optimized for desktop applications
- No external dependencies for fonts

---

## 🚀 Future Extensions

- Dark mode support (variables ready)
- Additional component variants
- Extended color palettes for themes
- Mobile-responsive utilities
- Print styles for invoices













