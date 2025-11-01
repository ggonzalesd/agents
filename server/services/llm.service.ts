import type * as LLMPort from '$/ports/llm.port';

import * as OpenAIService from './openai.service';

export const ask: LLMPort.ModelAskPort = OpenAIService.ask;

export const embed: LLMPort.ModelEmbedPort = OpenAIService.embed;
