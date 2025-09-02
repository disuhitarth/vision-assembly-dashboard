# 📸 Dashboard Screenshots

This directory contains screenshots of the Industrial Vision Assembly Dashboard.

## 🎯 Taking Screenshots

To capture screenshots of your running dashboard:

### Method 1: Browser Screenshots
1. Open the dashboard: http://localhost:3000
2. Use your browser's screenshot tool:
   - **Chrome**: Ctrl+Shift+P → "Screenshot" → "Capture full size screenshot"
   - **Firefox**: F12 → Settings → "Take a screenshot of the entire page"
   - **Edge**: F12 → Device toolbar → Screenshot icon

### Method 2: System Screenshot Tools
- **Windows**: Windows Key + Shift + S
- **Mac**: Cmd + Shift + 4 (drag to select area)
- **Linux**: Use `gnome-screenshot` or similar

### Method 3: Automated Screenshot (Node.js)
```bash
# Install playwright for automated screenshots
npm install playwright
node scripts/take-screenshots.js
```

## 📊 Recommended Screenshots

1. **main-dashboard.png** - Main overview with all widgets visible
2. **vision-system.png** - Camera feed with defect detection overlays
3. **analytics-dashboard.png** - Analytics tab with charts and trends
4. **help-system.png** - Help modal showing user instructions
5. **mobile-view.png** - Mobile responsive layout
6. **alarm-management.png** - Alarm system in action

## 🎨 Screenshot Guidelines

- **Resolution**: Minimum 1920x1080 for desktop views
- **Format**: PNG for UI screenshots, JPEG for photo content
- **Naming**: Use descriptive kebab-case names
- **Content**: Show realistic data, avoid empty states
- **Privacy**: Remove any sensitive information

## 📁 File Structure

```
screenshots/
├── README.md                   # This file
├── main-dashboard.png          # Main dashboard overview
├── vision-system.png           # Live camera with defects
├── analytics-dashboard.png     # Charts and analytics
├── help-system.png             # Built-in help modal
├── mobile-view.png             # Mobile responsive design
├── alarm-management.png        # Active alarms display
├── emergency-stop.png          # Safety controls
└── production-metrics.png      # Live production data
```

## 🚀 Usage in Documentation

These screenshots are automatically referenced in:
- README.md (main documentation)
- GitHub repository display
- Marketing materials
- User guides and tutorials

To update screenshots, simply replace the files with the same names.