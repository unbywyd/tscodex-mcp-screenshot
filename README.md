# @tscodex/mcp-screenshot

MCP server for capturing web page screenshots using Playwright. Supports full page, viewport, and element screenshots with optional script execution for complex interactions.

## Features

- **Full page screenshots** - capture entire scrollable content
- **Viewport screenshots** - capture visible area only
- **Element screenshots** - capture specific DOM elements by CSS selector
- **Script execution** - run Playwright code for complex interactions (click menus, fill forms, hover elements)
- **Multiple formats** - PNG, JPEG, WebP
- **Custom viewports** - test responsive layouts
- **Preview generation** - returns optimized base64 preview image

## Installation

```bash
npm install @tscodex/mcp-screenshot
```

Playwright will automatically install Chromium browser during postinstall.

## Usage

### With MCP Manager

Register the server in [MCP Manager](https://tscodex.com/mcp-manager):

1. Open MCP Manager
2. Add new server: `@tscodex/mcp-screenshot`
3. Enable for your workspace

### Standalone

```bash
npx @tscodex/mcp-screenshot
```

Or run from source:

```bash
npm run build
npm start
```

## Tools

### screenshot_capture

Main tool for capturing screenshots.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | URL of the page to screenshot |
| `outputPath` | string | ✅ | Relative path for saving (from project root) |
| `selector` | string | ❌ | CSS selector - screenshot only this element |
| `fullPage` | boolean | ❌ | Screenshot entire page (default: false) |
| `waitFor` | number | ❌ | Delay before screenshot in ms (0-30000) |
| `waitForSelector` | string | ❌ | Wait for element before screenshot |
| `format` | string | ❌ | Image format: png, jpeg, webp (default: png) |
| `quality` | number | ❌ | Quality for jpeg/webp (1-100) |
| `viewport` | object | ❌ | `{width, height}` - browser viewport |
| `deviceScaleFactor` | number | ❌ | Device scale (1=normal, 2=retina) |
| `timeout` | number | ❌ | Page load timeout in ms |
| `script` | string | ❌ | Playwright script to execute |

**Examples:**

Simple screenshot:
```json
{
  "url": "https://example.com",
  "outputPath": "screenshots/homepage.png"
}
```

Full page:
```json
{
  "url": "https://example.com",
  "outputPath": "screenshots/full.png",
  "fullPage": true
}
```

Element screenshot:
```json
{
  "url": "https://example.com",
  "outputPath": "screenshots/header.png",
  "selector": "#main-header"
}
```

Mobile viewport:
```json
{
  "url": "https://example.com",
  "outputPath": "screenshots/mobile.png",
  "viewport": { "width": 375, "height": 812 },
  "deviceScaleFactor": 2
}
```

With script (dropdown menu):
```json
{
  "url": "https://example.com/app",
  "outputPath": "screenshots/dropdown.png",
  "script": "await page.click('#menu-btn'); await page.waitForSelector('.dropdown'); await screenshot({ selector: '.dropdown' });"
}
```

With script (form validation):
```json
{
  "url": "https://example.com/login",
  "outputPath": "screenshots/error.png",
  "script": "await page.fill('#email', 'invalid'); await page.click('button[type=submit]'); await page.waitForSelector('.error'); await screenshot();"
}
```

### screenshot_element

Simplified tool for element screenshots only.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | Page URL |
| `selector` | string | ✅ | CSS selector of element |
| `outputPath` | string | ✅ | Path for saving |
| `waitFor` | number | ❌ | Delay in ms |

## Script Execution

When using the `script` parameter, you write Playwright code that runs in a secure VM sandbox.

**Important:** Your script MUST call `screenshot()` to capture the image. This function terminates the script.

### Available Functions

```javascript
// Screenshot (REQUIRED - call this to capture)
await screenshot();                          // viewport
await screenshot({ fullPage: true });        // full page
await screenshot({ selector: '.element' });  // specific element

// Page interactions
await page.click('#button');
await page.dblclick('#item');
await page.fill('#input', 'text');
await page.type('#input', 'text');
await page.press('Enter');
await page.hover('.element');
await page.focus('#input');
await page.check('#checkbox');
await page.uncheck('#checkbox');
await page.selectOption('#select', 'value');

// Waiting
await page.waitForSelector('.loaded');
await page.waitForTimeout(1000);
await page.waitForLoadState('networkidle');
await page.waitForURL('https://...');
await wait(500);  // helper function

// Locators
await page.locator('.item').click();
await page.getByText('Click me').click();
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByPlaceholder('Email').fill('test@test.com');
await page.getByLabel('Password').fill('secret');
await page.getByTestId('submit-btn').click();

// Evaluate in browser
await page.evaluate(() => window.scrollTo(0, 100));
```

### NOT Available (blocked for security)

- `require`, `import`
- `process`, `global`
- File system access
- Network access outside browser
- Any Node.js APIs

### Timeouts

- Script execution: 60 seconds max
- `wait()` / `waitForTimeout()`: 30 seconds max

## Configuration

Create `.mcp-screenshot.json` in your project root:

```json
{
  "defaultViewportWidth": 1920,
  "defaultViewportHeight": 1080,
  "defaultFormat": "png",
  "defaultQuality": 80,
  "defaultTimeout": 30000,
  "headless": true,
  "includePreview": true,
  "previewMaxSize": 400
}
```

## Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Screenshot saved successfully!\n\nPath: screenshots/homepage.png\nSize: 1920x1080\nFormat: png\nFile size: 245KB\n\nFull path: /path/to/project/screenshots/homepage.png"
    },
    {
      "type": "image",
      "mimeType": "image/jpeg",
      "data": "<base64-preview-400x400>"
    }
  ]
}
```

## Error Handling

| Error | Description |
|-------|-------------|
| `Invalid URL` | Only http/https protocols supported |
| `Invalid output path` | Path traversal or outside project root |
| `Element not found` | Selector didn't match any element |
| `Script timeout` | Script exceeded 60 seconds |
| `Script must call screenshot()` | Script finished without capturing |

## Requirements

- Node.js >= 18.0.0
- Chromium (installed automatically)

## Links

- [MCP Manager](https://tscodex.com/mcp-manager) - GUI for managing MCP servers
- [@tscodex/mcp-sdk](https://www.npmjs.com/package/@tscodex/mcp-sdk) - SDK for building MCP servers
- [Playwright Documentation](https://playwright.dev/docs/api/class-page)

## License

MIT
