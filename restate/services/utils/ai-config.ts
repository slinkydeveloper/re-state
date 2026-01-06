/**
 * Shared configuration for AI model calls with durable execution.
 *
 * These retry settings ensure resilient AI calls that can recover from:
 * - Transient API failures
 * - Rate limiting
 * - Network issues
 *
 * The exponential backoff with max retry interval prevents overwhelming the API.
 */
export const DURABLE_AI_RETRY_CONFIG = {
  maxRetryAttempts: 10,
  initialRetryInterval: { seconds: 1 },
  maxRetryInterval: { seconds: 10 },
};

/**
 * Shared configuration for ctx.run() operations that perform web fetching.
 *
 * These retry settings ensure resilient web scraping that can recover from:
 * - Temporary network failures
 * - Anti-bot protection rate limiting
 * - Server-side errors
 *
 * The exponential backoff with max retry interval prevents overwhelming target servers.
 */
export const DURABLE_FETCH_RETRY_CONFIG = {
  maxRetryAttempts: 10,
  initialRetryInterval: { seconds: 1 },
  maxRetryInterval: { seconds: 10 },
};
