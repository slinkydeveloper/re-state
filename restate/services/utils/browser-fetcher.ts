import "server-only";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";
import { existsSync } from "fs";

// Add stealth plugin globally (only once)
puppeteer.use(StealthPlugin());

/**
 * Fetches a URL using an external scraping service or Puppeteer.
 * Supports: ScraperAPI, ScrapingBee, ZenRows (all have free tiers)
 * Falls back to Puppeteer if no API key is set.
 */
export async function fetchWithBrowser(url: string): Promise<string> {
  // Try different services in order of preference
  const scraperApiKey = process.env.SCRAPERAPI_API_KEY;
  const scrapingBeeApiKey = process.env.SCRAPINGBEE_API_KEY;
  const zenRowsApiKey = process.env.ZENROWS_API_KEY;

  if (scraperApiKey) {
    return fetchWithScraperAPI(url, scraperApiKey);
  }

  if (scrapingBeeApiKey) {
    return fetchWithScrapingBee(url, scrapingBeeApiKey);
  }

  if (zenRowsApiKey) {
    return fetchWithZenRows(url, zenRowsApiKey);
  }

  // Otherwise fall back to Puppeteer
  return fetchWithPuppeteer(url);
}

/**
 * Fetches a URL using ScraperAPI (5000 free requests/month - BEST FREE TIER!)
 */
async function fetchWithScraperAPI(url: string, apiKey: string): Promise<string> {
  const scraperApiUrl = new URL('https://api.scraperapi.com/');
  scraperApiUrl.searchParams.append('api_key', apiKey);
  scraperApiUrl.searchParams.append('url', url);
  scraperApiUrl.searchParams.append('render', 'true');
  scraperApiUrl.searchParams.append('country_code', 'it');

  const response = await fetch(scraperApiUrl.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ScraperAPI error (${response.status}): ${errorText}\nURL: ${url}`
    );
  }

  return await response.text();
}

/**
 * Fetches a URL using ScrapingBee API (1000 free requests/month)
 */
async function fetchWithScrapingBee(url: string, apiKey: string): Promise<string> {
  const scrapingBeeUrl = new URL('https://app.scrapingbee.com/api/v1/');
  scrapingBeeUrl.searchParams.append('api_key', apiKey);
  scrapingBeeUrl.searchParams.append('url', url);
  scrapingBeeUrl.searchParams.append('render_js', 'true');
  scrapingBeeUrl.searchParams.append('block_resources', 'false'); // Don't block resources to avoid detection
  scrapingBeeUrl.searchParams.append('stealth_proxy', 'true'); // Use stealth proxy instead of premium
  scrapingBeeUrl.searchParams.append('wait', '3000'); // Wait 3 seconds for JS to render
  scrapingBeeUrl.searchParams.append('country_code', 'it');

  const response = await fetch(scrapingBeeUrl.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ScrapingBee error (${response.status}): ${errorText}\nURL: ${url}`
    );
  }

  return await response.text();
}

/**
 * Fetches a URL using ZenRows API (1000 free requests/month)
 */
async function fetchWithZenRows(url: string, apiKey: string): Promise<string> {
  const zenRowsUrl = new URL('https://api.zenrows.com/v1/');
  zenRowsUrl.searchParams.append('apikey', apiKey);
  zenRowsUrl.searchParams.append('url', url);
  zenRowsUrl.searchParams.append('js_render', 'true');
  zenRowsUrl.searchParams.append('premium_proxy', 'true');

  const response = await fetch(zenRowsUrl.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ZenRows error (${response.status}): ${errorText}\nURL: ${url}`
    );
  }

  return await response.text();
}

/**
 * Fetches a URL using Puppeteer with stealth plugin.
 * This is the fallback method when ScrapingBee is not available.
 */
async function fetchWithPuppeteer(url: string): Promise<string> {

  // Determine if we're running locally or on Vercel/Lambda
  const isLocal = !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const launchOptions: Record<string, any> = {
    args: isLocal
      ? [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--allow-running-insecure-content',
        ]
      : [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
    defaultViewport: null, // Don't set viewport, let it be natural
    headless: 'new', // Use new headless mode (harder to detect)
    ignoreHTTPSErrors: true,
  };

  // For serverless, use @sparticuz/chromium
  if (!isLocal) {
    launchOptions.executablePath = await chromium.executablePath();
  } else {
    // For local development, try to find Chrome/Chromium
    // puppeteer-core requires an executable path
    const possiblePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];

    let foundPath: string | null = null;
    for (const path of possiblePaths) {
      try {
        if (existsSync(path)) {
          foundPath = path;
          break;
        }
      } catch {
        // Continue checking
      }
    }

    if (foundPath) {
      launchOptions.executablePath = foundPath;
    } else {
      throw new Error(
        'Could not find Chrome/Chromium executable. Please install Chrome or set CHROME_PATH environment variable.'
      );
    }
  }

  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();

    // Override navigator properties to avoid detection
    await page.evaluateOnNewDocument(() => {
      // Override the navigator.webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Override the navigator.plugins to look like a real browser
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override the navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['it-IT', 'it', 'en-US', 'en'],
      });

      // Add chrome property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).chrome = {
        runtime: {},
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : originalQuery(parameters);
    });

    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    });

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to the page and wait for it to load
    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    if (!response) {
      await browser.close();
      throw new Error(`Failed to load page: ${url} - No response received`);
    }

    const status = response.status();

    // Get response headers for debugging
    const headers = response.headers();
    const headersStr = JSON.stringify(headers, null, 2);

    if (status === 404) {
      await browser.close();
      throw new Error(
        `Ad not found (404): ${url}\nResponse headers:\n${headersStr}`
      );
    } else if (status === 403) {
      const bodyPreview = (await page.content()).slice(0, 500);
      await browser.close();
      throw new Error(
        `Access denied (403): ${url}\n` +
        `Possible anti-bot protection detected.\n` +
        `Response headers:\n${headersStr}\n` +
        `Body preview:\n${bodyPreview}`
      );
    } else if (status >= 500) {
      await browser.close();
      throw new Error(
        `Server error (${status}): ${url}\n` +
        `Response headers:\n${headersStr}`
      );
    } else if (status !== 200 && status !== 304) {
      await browser.close();
      throw new Error(
        `Failed to fetch (${status}): ${url}\n` +
        `Response headers:\n${headersStr}`
      );
    }

    // Add some human-like behavior
    // Random mouse movements
    await page.mouse.move(100, 100);
    await page.waitForTimeout(100);
    await page.mouse.move(200, 200);
    await page.waitForTimeout(150);

    // Scroll down a bit like a human would
    await page.evaluate(() => {
      window.scrollBy(0, Math.floor(Math.random() * 500) + 100);
    });

    // Wait a bit more for any dynamic content to load
    await page.waitForTimeout(2000);

    // Get the final HTML content
    const content = await page.content();
    await browser.close();

    return content;
  } catch (error) {
    await browser.close();
    throw error;
  }
}
