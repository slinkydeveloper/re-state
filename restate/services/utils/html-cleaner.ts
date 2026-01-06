import * as cheerio from "cheerio";

/**
 * Cleans HTML to remove noise and extract the main content.
 * This reduces the payload size for AI processing and improves extraction quality.
 */
export function cleanHtmlForAI(html: string): string {
  const $ = cheerio.load(html);

  // Remove noise elements
  $("script, style, nav, header, footer, iframe, noscript").remove();

  // Remove common noise selectors (ads, tracking, cookie banners, etc.)
  $('[class*="cookie"]').remove();
  $('[class*="banner"]').remove();
  $('[class*="advertisement"]').remove();
  $('[id*="cookie"]').remove();
  $('[id*="banner"]').remove();

  // Get the cleaned HTML - focus on main content area if possible
  const mainContent = $('main').html() || $('[role="main"]').html() || $.html();

  return mainContent;
}
