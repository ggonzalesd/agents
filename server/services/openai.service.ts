import openaiCli from '$/config/openai.config';

import type * as LLMPort from '$/ports/llm.port';

export const ask: LLMPort.ModelAskPort = async (
	_question,
	_instructions,
	_model,
) =>
	openaiCli.responses
		.create({
			model: _model ?? 'gpt-4.1-mini',
			instructions:
				_instructions ??
				'You are an NPC in a game world making decisions based on context, response with JSON format.',
			input: _question,
		})
		.then((output) => output.output_text);

export const embed: LLMPort.ModelEmbedPort = async (_text, _dimension) =>
	openaiCli.embeddings
		.create({
			model: 'text-embedding-3-large',
			input: _text,
		})
		.then((r) => r.data.map((item) => item.embedding));
