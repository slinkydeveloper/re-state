import * as clients from "@restatedev/restate-sdk-clients";

const RESTATE_URL = process.env.RESTATE_URL || "http://localhost:8080";
const RESTATE_CLOUD_TOKEN = process.env.RESTATE_CLOUD_TOKEN;

/**
 * Singleton Restate client with optional authentication
 */
let restateClient: clients.Ingress | null = null;

export function getRestateClient(): clients.Ingress {
  if (!restateClient) {
    const headers: Record<string, string> = {};

    // Add authentication header if Restate Cloud token is provided
    if (RESTATE_CLOUD_TOKEN) {
      headers["Authorization"] = `Bearer ${RESTATE_CLOUD_TOKEN}`;
    }

    restateClient = clients.connect({
      url: RESTATE_URL,
      headers,
    });
  }

  return restateClient;
}
