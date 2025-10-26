import openaiCli from '$/config/openai.config';

export const ask = async (
	_question: string,
	_instructions?: string,
): Promise<string> => {
	const output = await openaiCli.responses.create({
		model: 'gpt-4.1-mini',
		instructions:
			_instructions ??
			'You are an NPC in a game world making decisions based on context, response with JSON format.',
		input: _question,
	});

	return output.output_text;
};
