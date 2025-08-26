import { v4 as uuidv4 } from 'uuid';

import { type LLMService } from '.';
import { Option } from '#/utils/Option';

export class ManualLLMService implements LLMService {
	private requests: Map<
		string,
		{ question: string; resolve: (response: string) => void }
	>;

	constructor() {
		this.requests = new Map();
	}

	private static instance: ManualLLMService;

	static getInstance(): ManualLLMService {
		if (!ManualLLMService.instance) {
			ManualLLMService.instance = new ManualLLMService();
		}
		return ManualLLMService.instance;
	}

	getManualRequests() {
		return [...this.requests.entries()].map(([id, { question }]) => ({
			id,
			question,
		}));
	}

	getManualRequest(id: string) {
		return Option.of(this.requests.get(id));
	}

	resolveManualRequest(id: string, response: string) {
		const request = this.requests.get(id);
		if (request) {
			request.resolve(response);
			this.requests.delete(id);
		}
	}

	askQuestion(question: string): Promise<string> {
		return new Promise<string>((resolve) => {
			this.requests.set(uuidv4(), {
				question,
				resolve,
			});
		});
	}

	async speechToText(audio: Blob): Promise<string> {
		return 'Manual transcription of audio size: ' + audio.size;
	}

	async vectorize(text: string): Promise<number[]> {
		return [0, 1, 2, text.length];
	}
}
