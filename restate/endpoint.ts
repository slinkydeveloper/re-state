import * as restate from "@restatedev/restate-sdk/fetch";
import { researchTracker } from "@/restate/services/research-tracker";

export const endpoint = restate.createEndpointHandler({
  services: [researchTracker],
});