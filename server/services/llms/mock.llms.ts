import type { LLMService } from '.';

export const mockLLMService: LLMService = {
	askQuestion: async (question: string) => {
		return 'This is a mock response: ' + question;
	},
	speechToText: async (audio: Blob) => {
		return 'This is a mock transcription: ' + audio.size;
	},
	vectorize: async (text: string) => {
		return [0, 1, 2, text.length];
	},
};
