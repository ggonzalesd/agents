import openaiCli from '$/config/openai.config';

export default class OpenAIService {
	constructor() {}

	async ask(_question: string): Promise<string> {
		const output = await openaiCli.responses.create({
			model: 'gpt-4',
			instructions:
				'You are an NPC in a game world making decisions based on context, response with JSON format.',
			input: _question,
		});

		return output.output_text;
	}
}
