# KPI Dashboard - Modular Architecture

## 📁 Project Structure

```
KPI Framework/
├── index.html                    # Main HTML structure
├── css/
│   └── custom.css               # Custom styles and animations
├── js/
│   ├── kpi-database.js          # KPI data repository
│   └── app.js                   # Application logic and views
└── README.md                    # This file
```

## 🎯 Separation of Concerns

### `index.html`
- **Purpose**: HTML structure and layout only
- **Contains**: 
  - Semantic HTML markup
  - Tailwind CSS via CDN
  - External script references
  - No inline JavaScript (clean separation)
  - No embedded styles (clean separation)
- **Maintainability**: Easy to modify UI without touching logic

### `css/custom.css`
- **Purpose**: Custom styles, animations, and utilities
- **Contains**:
  - CSS variables for colors
  - Custom animations (@keyframes)
  - Component-specific styles (.kpi-card, .status-pulse, etc.)
  - Responsive utilities
  - Accessibility features
  - Scroll bar styling
- **Maintainability**: Centralized styling makes theme changes easy

### `js/kpi-database.js`
- **Purpose**: Single source of truth for KPI data
- **Contains**:
  - KPI data array (85+ KPIs)
  - Department metadata
  - Category definitions
  - Color mappings
- **Advantages**:
  - Easy to update data without touching code logic
  - Can be replaced with API calls to backend
  - Reusable in other projects
  - Easy to add/remove KPIs

### `js/app.js`
- **Purpose**: Application logic and view management
- **Contains**:
  - `KPIDashboard` class (single responsibility)
  - View switching logic (CEO, Board, Department)
  - Filtering and searching
  - Rendering methods
  - Event handling
- **Architecture**: 
  - Object-oriented design
  - Single instance managed globally as `window.dashboard`
  - Clean method organization

## 🔄 Data Flow

```
User Interaction
    ↓
Event Listener (app.js)
    ↓
Filter/Search Logic (app.js)
    ↓
Render Method (app.js)
    ↓
DOM Update + CSS Styling (index.html + custom.css)
    ↓
Visual Update
```

## 🚀 How to Extend

### Add a New KPI
1. Open `js/kpi-database.js`
2. Add to `kpiDatabase` array:
```javascript
{ 
  id: 106, 
  name: 'New KPI Name', 
  dept: 'CYP', 
  category: 'Demand', 
  current: 100, 
  target: 95, 
  status: 'green', 
  trend: '+5%', 
  description: 'Description' 
}
```

### Add a New Department
1. Update `departments` array in `kpi-database.js`
2. Update `<select>` options in `index.html`
3. No other changes needed!

### Add a New View
1. Create new `<div id="myView">` in `index.html`
2. Add render method in `KPIDashboard` class in `app.js`
3. Add button to switch to new view
4. Update `switchView()` method

### Customize Styling
1. Open `css/custom.css`
2. Modify or add new styles
3. No need to touch HTML or JavaScript

### Connect to Real Data
1. In `app.js`, replace `kpiDatabase` reference with API call
2. Example:
```javascript
async getKPIData() {
  const response = await fetch('/api/kpis');
  return await response.json();
}
```

## 🎨 Color System

Defined in `css/custom.css`:

```css
:root {
    --color-green: #10B981;
    --color-amber: #F59E0B;
    --color-red: #EF4444;
    --color-blue: #3B82F6;
    /* etc... */
}
```

Update these values to rebrand entire dashboard.

## 📱 Responsive Design

- Tailwind CSS handles responsive classes
- Custom media queries in `custom.css` for specific needs
- Mobile-first approach with `md:` and `lg:` prefixes

## ♿ Accessibility

- Semantic HTML
- ARIA labels where needed
- Focus states on buttons
- Reduced motion support (`prefers-reduced-motion`)
- Color contrast ratios meet WCAG standards

## 🔒 Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Tailwind CSS via CDN works on all modern browsers
- ES6 JavaScript features used (class syntax, arrow functions, template literals)

## 🐛 Debugging Tips

1. **Check Console**: Open DevTools → Console
2. **Check Network**: DevTools → Network tab for file loading
3. **Check Classes**: Use DevTools Inspector to verify CSS classes applied
4. **Test Views**: Use DevTools to pause on DOM breakpoints
5. **Profile Performance**: Use DevTools Performance tab

## 📈 Future Enhancements

- [ ] Add data export (CSV, PDF)
- [ ] Add real-time data updates with WebSocket
- [ ] Add user preferences (theme, default view)
- [ ] Add detailed drill-down views for each KPI
- [ ] Add historical trend charts
- [ ] Add role-based access control
- [ ] Add audit logging
- [ ] Add data validation

## 🔄 Maintenance Guide

### Adding a Field to KPI
1. Add field to `kpiDatabase.js` objects
2. Update rendering logic in relevant render methods in `app.js`
3. Update HTML templates in render methods

### Updating UI Layout
1. Modify HTML in `index.html`
2. Adjust Tailwind classes as needed
3. Add custom CSS to `custom.css` if needed

### Performance Optimization
- Currently renders all KPIs in viewport
- Could implement virtual scrolling for 1000+ KPIs
- Could add lazy loading for images
- Could implement service workers for offline capability

## 📝 Code Style

- **HTML**: Semantic, clean, no inline styles/scripts
- **CSS**: Organized by concern (animations, components, utilities)
- **JavaScript**: 
  - Class-based OOP
  - Descriptive method names
  - Comments for complex logic
  - No global functions (only class methods + DOM event handlers)

## 🤝 Contributing

When modifying code:
1. Keep concerns separated (no mixing HTML/CSS/JS)
2. Update this README if adding new features
3. Test all three views (CEO, Board, Department)
4. Test on mobile viewports
5. Ensure no console errors

---

**Last Updated**: June 3, 2026
**Version**: 1.0
**Status**: Production Ready
