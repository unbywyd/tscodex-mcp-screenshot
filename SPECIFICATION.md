# MCP Screenshot Server - Specification

## Overview

MCP server for creating screenshots of web pages. Uses Playwright for cross-platform operation (Windows, macOS, Linux).

**Package name:** `@tscodex/mcp-screenshot`
**Version:** `0.1.0`

---

## Main Features

1. **Full page screenshot** (fullPage) - entire content with scrolling
2. **Viewport screenshot** - only visible area
3. **Element screenshot** - specific DOM element by CSS selector
4. **Loading wait** - timer or wait for element appearance
5. **Viewport configuration** - custom browser window sizes
6. **Script execution** - run Playwright code before screenshot (for complex interactions)

---

## Tools

### 1. `screenshot_capture`

**Description for AI (description in tool schema):**

```
Capture screenshots of web pages. Use this tool to:
- Document UI state for debugging or reporting
- Capture visual evidence of web page content
- Take screenshots of specific elements using CSS selectors
- Create visual documentation of responsive layouts at different viewport sizes

The tool opens the URL in a headless browser, waits for the page to load, and saves the screenshot to the specified path relative to the project root.

Returns: Path to saved file, image dimensions, file size, and a small preview image.
```

**Full description:**

Tool for creating screenshots of web pages. Opens URL in a headless browser (Chromium via Playwright), takes a screenshot and saves it to the specified path.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | ✅ | - | URL of the page to screenshot |
| `outputPath` | string | ✅ | - | Relative path for saving (from project root) |
| `selector` | string | ❌ | - | CSS selector of element. If specified - screenshot only this element |
| `fullPage` | boolean | ❌ | `false` | Screenshot entire page (ignored if `selector` is specified) |
| `waitFor` | number | ❌ | `0` | Delay before screenshot in milliseconds (0-30000) |
| `waitForSelector` | string | ❌ | - | Wait for element appearance by selector before screenshot |
| `format` | enum | ❌ | `'png'` | Image format: `'png'`, `'jpeg'`, `'webp'` |
| `quality` | number | ❌ | `80` | Quality for jpeg/webp (1-100, ignored for png) |
| `viewport` | object | ❌ | `{width: 1920, height: 1080}` | Browser viewport dimensions |
| `viewport.width` | number | ❌ | `1920` | Viewport width |
| `viewport.height` | number | ❌ | `1080` | Viewport height |
| `deviceScaleFactor` | number | ❌ | `1` | Device scale factor (1 = normal, 2 = retina) |
| `timeout` | number | ❌ | `30000` | Page load timeout in ms |
| `script` | string | ❌ | - | Playwright script to execute before screenshot (runs in VM sandbox) |

#### Usage Examples

**Full page screenshot:**
```json
{
  "url": "https://example.com",
  "outputPath": "screenshots/homepage.png",
  "fullPage": true
}
```

**Specific element screenshot:**
```json
{
  "url": "https://example.com",
  "outputPath": "screenshots/header.png",
  "selector": "#main-header"
}
```

**Screenshot with loading wait:**
```json
{
  "url": "https://example.com/dashboard",
  "outputPath": "screenshots/dashboard.png",
  "waitForSelector": ".chart-loaded",
  "waitFor": 1000
}
```

**Mobile viewport:**
```json
{
  "url": "https://example.com",
  "outputPath": "screenshots/mobile.png",
  "viewport": {
    "width": 375,
    "height": 812
  },
  "deviceScaleFactor": 2
}
```

**Screenshot with script (complex interactions):**
```json
{
  "url": "https://example.com/app",
  "outputPath": "screenshots/dropdown-menu.png",
  "script": "await page.click('#user-menu-button'); await page.waitForSelector('.dropdown-menu'); await wait(300); await screenshot();"
}
```

**Multi-step form interaction:**
```json
{
  "url": "https://example.com/login",
  "outputPath": "screenshots/login-error.png",
  "script": "await page.fill('#email', 'test@example.com'); await page.fill('#password', 'wrong'); await page.click('button[type=submit]'); await page.waitForSelector('.error-message'); await screenshot();"
}
```

**Screenshot specific element after interaction:**
```json
{
  "url": "https://example.com/dashboard",
  "outputPath": "screenshots/tooltip.png",
  "script": "await page.hover('.info-icon'); await page.waitForSelector('.tooltip'); await screenshot({ selector: '.tooltip' });"
}
```

> **Note:** When `script` is provided, you MUST call `screenshot()` to capture the image. The script controls when the screenshot is taken. Without `script`, screenshot is taken automatically after page load.

#### Return Value

```typescript
{
  content: [
    {
      type: 'text',
      text: `Screenshot saved successfully!

Path: screenshots/homepage.png
Size: 1920x3500
Format: png
File size: 245KB

Full path: /path/to/project/screenshots/homepage.png`
    },
    {
      type: 'image',
      mimeType: 'image/jpeg',
      data: '<base64-optimized-preview-400x400>'
    }
  ]
}
```

> **Preview:** Sharp creates an optimized 400x400 JPEG preview (quality: 75) for compact base64. Original is saved in the specified format.

---

### 2. `screenshot_element` (optional, alias)

**Description for AI (description in tool schema):**

```
Capture a screenshot of a specific DOM element on a web page. This is a simplified version of screenshot_capture focused on element screenshots.

Use this when you need to capture only a specific part of the page, such as:
- A button, form, or navigation component
- A chart or data visualization
- A specific section identified by CSS selector

The element is captured with its exact boundaries - no extra padding or surrounding content.
```

**Full description:**

Simplified tool for element screenshots only.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | Page URL |
| `selector` | string | ✅ | CSS selector of element |
| `outputPath` | string | ✅ | Path for saving |
| `waitFor` | number | ❌ | Delay in ms |

---

## Server Configuration

### Configuration Schema

```typescript
const ConfigSchema = Type.Object({
  // Project root (passed via header or config)
  root: Type.Optional(Type.String()),

  // Default viewport
  defaultViewportWidth: Type.Number({ default: 1920, min: 320, max: 3840 }),
  defaultViewportHeight: Type.Number({ default: 1080, min: 240, max: 2160 }),

  // Default format
  defaultFormat: Type.Enum(['png', 'jpeg', 'webp'], { default: 'png' }),
  defaultQuality: Type.Number({ default: 80, min: 1, max: 100 }),

  // Timeouts
  defaultTimeout: Type.Number({ default: 30000, min: 1000, max: 120000 }),

  // Browser
  headless: Type.Boolean({ default: true }),

  // Preview in response
  includePreview: Type.Boolean({ default: true }),
  previewMaxSize: Type.Number({ default: 400, min: 100, max: 800 })
});
```

### Configuration File

`.mcp-screenshot.json` in project root:

```json
{
  "defaultViewportWidth": 1920,
  "defaultViewportHeight": 1080,
  "defaultFormat": "png",
  "defaultQuality": 80,
  "headless": true,
  "includePreview": true
}
```

---

## Architecture

### Project Structure

```
mcp-screenshot/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # McpServer setup
│   ├── config.ts             # TypeBox schema
│   ├── browser/
│   │   └── browser-manager.ts  # Browser singleton
│   └── tools/
│       └── screenshot.ts     # Tool handlers
├── package.json
├── tsconfig.json
└── README.md
```

### Browser Manager

Playwright browser instance management:

```typescript
class BrowserManager {
  private browser: Browser | null = null;

  // Lazy initialization - browser starts on first request
  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  // Create new context for isolation
  async createContext(viewport?: Viewport): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    return browser.newContext({
      viewport: viewport || { width: 1920, height: 1080 }
    });
  }

  // Graceful shutdown
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
```

### Script Sandbox (VM)

Secure execution of user-provided Playwright scripts using Node.js `vm` module:

```typescript
import vm from 'node:vm';
import type { Page } from 'playwright';

/**
 * Execute user script in isolated VM context
 * - Only whitelisted page methods are available
 * - No access to Node.js APIs (fs, process, require, etc.)
 * - Timeout protection (60s max)
 */
interface ScreenshotOptions {
  selector?: string;
  fullPage?: boolean;
}

interface ScriptResult {
  buffer: Buffer;
  options: ScreenshotOptions;
}

/**
 * Special error class to signal successful screenshot capture
 * Used to break out of script execution when screenshot() is called
 */
class ScreenshotTaken extends Error {
  constructor(public result: ScriptResult) {
    super('Screenshot taken');
    this.name = 'ScreenshotTaken';
  }
}

async function executeScript(script: string, page: Page): Promise<ScriptResult> {
  // Create isolated context with only allowed APIs
  const context = vm.createContext({
    page: {
      // Navigation
      goto: (url: string) => page.goto(url),
      reload: () => page.reload(),
      goBack: () => page.goBack(),
      goForward: () => page.goForward(),

      // Interactions
      click: (selector: string) => page.click(selector),
      dblclick: (selector: string) => page.dblclick(selector),
      fill: (selector: string, text: string) => page.fill(selector, text),
      type: (selector: string, text: string) => page.type(selector, text),
      press: (key: string) => page.keyboard.press(key),
      hover: (selector: string) => page.hover(selector),
      focus: (selector: string) => page.focus(selector),
      selectOption: (selector: string, value: string) => page.selectOption(selector, value),
      check: (selector: string) => page.check(selector),
      uncheck: (selector: string) => page.uncheck(selector),

      // Waiting
      waitForSelector: (selector: string, options?: object) =>
        page.waitForSelector(selector, options),
      waitForLoadState: (state?: string) => page.waitForLoadState(state as any),
      waitForTimeout: (ms: number) => page.waitForTimeout(Math.min(ms, 30000)),
      waitForURL: (url: string) => page.waitForURL(url),

      // Locators
      locator: (selector: string) => page.locator(selector),
      getByText: (text: string) => page.getByText(text),
      getByRole: (role: string, options?: object) => page.getByRole(role as any, options),
      getByPlaceholder: (text: string) => page.getByPlaceholder(text),
      getByLabel: (text: string) => page.getByLabel(text),

      // Evaluation (browser context only)
      evaluate: (fn: string) => page.evaluate(fn),
    },

    // THE MAIN FUNCTION - triggers screenshot and TERMINATES script
    screenshot: async (options: ScreenshotOptions = {}) => {
      let buffer: Buffer;
      if (options.selector) {
        buffer = await page.locator(options.selector).screenshot();
      } else if (options.fullPage) {
        buffer = await page.screenshot({ fullPage: true });
      } else {
        buffer = await page.screenshot();
      }

      // Throw special error to break out of script execution
      throw new ScreenshotTaken({ buffer, options });
    },

    // Helper functions
    wait: (ms: number) => new Promise(r => setTimeout(r, Math.min(ms, 30000))),

    // Disabled/blocked
    console: { log: () => {}, error: () => {}, warn: () => {} },
  });

  // Wrap script in async IIFE
  const wrappedScript = `(async () => { ${script} })()`;

  try {
    // Execute with timeout
    const result = vm.runInContext(wrappedScript, context, {
      timeout: 60000, // 60 seconds max
      displayErrors: true,
    });

    await result;

    // If we get here, script finished without calling screenshot()
    throw new Error('Script must call screenshot() to capture the image');
  } catch (e) {
    // Check if this is our special "success" error
    if (e instanceof ScreenshotTaken) {
      return e.result;
    }
    // Re-throw other errors
    throw e;
  }
}
```

**Available in script:**
- `screenshot(options?)` - **REQUIRED** - takes the screenshot and ends script
  - `screenshot()` - viewport screenshot
  - `screenshot({ fullPage: true })` - full page
  - `screenshot({ selector: '.element' })` - specific element
- `page.click()`, `page.fill()`, `page.hover()`, `page.press()`, etc.
- `page.waitForSelector()`, `page.waitForTimeout()`, `page.waitForLoadState()`
- `page.locator()`, `page.getByText()`, `page.getByRole()`, etc.
- `wait(ms)` - helper for delays (max 30s)

**NOT available (blocked):**
- `require`, `import`, `process`, `global`
- File system, network (outside browser)
- Any Node.js APIs

---

### Image Utils (Sharp)

Utilities for screenshot processing:

```typescript
import sharp from 'sharp';

/**
 * Create optimized preview for display in Cursor
 * - Resize to 400x400 (fit: inside)
 * - Convert to JPEG quality 75
 * - Return base64 string
 */
async function createPreview(buffer: Buffer): Promise<string> {
  const optimized = await sharp(buffer)
    .resize(400, 400, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality: 75,
      mozjpeg: true
    })
    .toBuffer();

  return optimized.toString('base64');
}

/**
 * Get image metadata
 */
async function getImageMetadata(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
}> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length
  };
}
```

---

## Workflow Logic

### screenshot_capture Algorithm

```
1. Parameter validation
2. Get browser context with specified viewport
3. Create new page
4. Navigate to URL (page.goto)
5. Wait for load (networkidle)
6. If waitForSelector - wait for element
7. If waitFor > 0 - wait specified time
8. If script - execute in VM sandbox
9. Take screenshot:
   - If selector: page.locator(selector).screenshot()
   - If fullPage: page.screenshot({ fullPage: true })
   - Otherwise: page.screenshot() (viewport only)
10. Save file
11. Create preview (base64, max 400x400)
12. Return result
13. Close page and context
```

### Error Handling

| Situation | Action |
|-----------|--------|
| URL unavailable | Return error with description |
| Selector not found | Return error "Element not found: {selector}" |
| Load timeout | Return error with current state |
| Invalid path | Return error "Invalid output path" |
| No write permissions | Return error "Cannot write to path" |
| Script error | Return error "Script execution failed: {message}" |
| Script timeout | Return error "Script timeout (60s limit)" |

---

## Dependencies

### Production

```json
{
  "@tscodex/mcp-sdk": "^0.0.6",
  "@sinclair/typebox": "^0.34.41",
  "playwright": "^1.40.0",
  "sharp": "^0.34.0"
}
```

**Sharp is used for:**
- Creating 400x400 preview for display in Cursor
- Cropping overly long fullPage screenshots
- Converting to JPEG with optimization for smaller base64

### Development

```json
{
  "@types/node": "^20.0.0",
  "typescript": "^5.3.0",
  "tsx": "^4.0.0"
}
```

### Postinstall

Playwright requires browser installation:

```json
{
  "scripts": {
    "postinstall": "playwright install chromium"
  }
}
```

---

## Integration with MCP Manager

### HTTP Transport

- Endpoint: `http://localhost:{port}/mcp`
- **Project root is passed via header: `X-MCP-Project-Root`**
- SDK automatically parses this header and passes it to context
- All file paths are relative to project root

### Getting Project Root in Handler

```typescript
server.addTool({
  name: 'screenshot_capture',
  schema: ScreenshotSchema,
  handler: async (params, context) => {
    // Project root from X-MCP-Project-Root header
    const projectRoot = context.meta?.projectRoot;

    if (!projectRoot) {
      throw new Error('Project root not provided. Use MCP Manager or set X-MCP-Project-Root header.');
    }

    // Full file path
    const fullPath = path.join(projectRoot, params.outputPath);

    // ... take screenshot and save to fullPath
  }
});
```

### Registration in MCP Manager

After `npm install` the server can be registered:
- Via MCP Manager UI
- Package name: `@tscodex/mcp-screenshot`

---

## Usage Scenario Examples

### 1. UI Documentation

```
"Take a screenshot of our site's homepage and save it to docs/screenshots/homepage.png"
```

### 2. Layout Testing

```
"Take screenshots of /products page in three sizes: desktop (1920x1080), tablet (768x1024), mobile (375x812)"
```

### 3. Component Screenshot

```
"Take a screenshot of only the .product-card block on /products/123 page"
```

### 4. Screenshot After Data Load

```
"Take a screenshot of the dashboard after charts load (wait for .chart-container element)"
```

---

## TODO / Possible Improvements

- [ ] Authentication support (cookies, headers)
- [ ] Screenshot multiple elements at once
- [ ] PDF page export
- [ ] Device emulation (iPhone, iPad, etc.)
- [ ] Ad/tracker blocking
- [ ] Screenshot with custom CSS styles
- [ ] Screenshot comparison (diff)
- [ ] Video/GIF recording

---

## Implementation Notes

### Why Playwright, not Puppeteer?

1. **Cross-platform** - works the same on Win/Mac/Linux
2. **Auto browser installation** - `playwright install chromium`
3. **Better API** - `locator().screenshot()` out of the box
4. **Active development** - Microsoft maintains it

### Resource Management

- One browser instance per server (singleton)
- New context for each request (isolation)
- Close page after each screenshot
- Graceful shutdown on server stop

### Security

- URL validation (http/https only)
- Check outputPath for directory traversal
- All files only within project root
- Timeouts to prevent hangs
