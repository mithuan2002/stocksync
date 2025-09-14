# Design Guidelines: CSV Inventory Reconciliation Tool

## Design Approach
**Utility-Focused Design System Approach** - Following Material Design principles for this productivity-focused tool that prioritizes efficiency and data clarity over visual flair.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 220 85% 45% (Professional blue)
- Surface: 0 0% 98% (Clean backgrounds)
- Text: 220 25% 15% (High contrast)
- Success: 120 60% 45% (Stock OK status)
- Warning: 35 85% 55% (Low stock alerts)
- Error: 0 75% 55% (Critical issues)

**Dark Mode:**
- Primary: 220 75% 65% (Lighter blue)
- Surface: 220 15% 8% (Dark backgrounds)
- Text: 220 10% 85% (Light text)
- Success: 120 50% 55%
- Warning: 35 75% 65%
- Error: 0 65% 65%

### Typography
- **Primary Font:** Inter (Google Fonts) - excellent for data readability
- **Headers:** 600-700 weight, sizes 24px-32px
- **Body:** 400-500 weight, 14px-16px
- **Data/Numbers:** 500 weight, monospace fallback for alignment

### Layout System
**Tailwind Spacing Units:** Consistent use of 2, 4, 6, 8, 12, 16 units
- Tight spacing (p-2, m-2) for data tables
- Medium spacing (p-4, m-4) for cards and sections
- Generous spacing (p-8, m-8) for page sections

### Component Library

**Navigation:**
- Clean sidebar with inventory overview, upload, and reports sections
- Breadcrumb navigation for multi-step processes
- Minimal top header with user actions

**Data Display:**
- Clean data tables with alternating row colors
- Status badges for stock levels (green/yellow/red)
- Progress indicators for CSV processing
- Summary cards showing key metrics

**Forms & Upload:**
- Prominent drag-and-drop CSV upload zone
- Clear file format requirements
- Threshold setting sliders with live preview
- Simple form validation with inline feedback

**Dashboard Elements:**
- Grid layout for inventory summary cards
- Sortable/filterable product tables
- Export buttons with clear download states
- Low-stock alerts prominently displayed

**Interactions:**
- Hover states on table rows for better scanning
- Loading states during CSV processing
- Success confirmations for uploads and exports
- Minimal, purposeful animations (fade-ins, subtle transitions)

## Key Design Principles
1. **Data Clarity:** Prioritize readability of inventory numbers and product information
2. **Workflow Efficiency:** Minimize clicks between upload → review → export
3. **Status Visibility:** Make low-stock items immediately identifiable
4. **Error Prevention:** Clear guidance on CSV formats and requirements
5. **Progressive Disclosure:** Show essential information first, details on demand

## Layout Strategy
- **Single-page dashboard** with tabbed sections (Upload, Inventory, Reports)
- **Responsive grid** that works well on desktop and tablet
- **Fixed header** with key actions always accessible
- **Sidebar navigation** for quick section switching

This design emphasizes functionality over aesthetics while maintaining a professional, trustworthy appearance that e-commerce sellers will appreciate for their business operations.