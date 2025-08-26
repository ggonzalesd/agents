import { ManualLLMService } from './manual.llm';

export interface LLMService {
	askQuestion(
		question: string,
		config: { model?: string; signal?: AbortSignal },
	): Promise<string>;
	speechToText(
		audio: Blob,
		config: { model?: string; signal?: AbortSignal },
	): Promise<string>;
	vectorize(
		text: string,
		config: { model?: string; signal?: AbortSignal },
	): Promise<number[]>;
}

export const getLLMService = (): LLMService => {
	return ManualLLMService.getInstance();
};
