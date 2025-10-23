import type { LLMService } from '.';

export const mockLLMService: LLMService = {
	askQuestion: async (question: string) =>
		`This is a mock response: ${question}`,
	speechToText: async (audio: Blob) =>
		`This is a mock transcription: ${audio.size}`,
	vectorize: async (text: string) => [0, 1, 2, text.length],
};
