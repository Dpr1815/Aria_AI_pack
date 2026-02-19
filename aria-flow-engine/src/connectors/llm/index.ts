import { ILLMConnector, LLMConnectorConfig } from "./ILLMConnector";
import { OpenAIConnector } from "./OpenAIConnector";

export const createLLMConnector = (
  config: LLMConnectorConfig,
): ILLMConnector => {
  return new OpenAIConnector(config);
};

export * from "./ILLMConnector";
export * from "./OpenAIConnector";
