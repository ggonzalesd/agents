import openaiCli from '$/config/openai.config';

import type * as LLMPort from '$/ports/llm.port';
// import { createReadStream } from 'node:fs';
// import { Readable } from 'node:stream';

export const ask: LLMPort.ModelAskPort = async (
	_question,
	_instructions,
	_model,
	_temperature,
) =>
	openaiCli.responses
		.create({
			model: _model ?? 'gpt-4.1-mini',
			instructions:
				_instructions ??
				'You are an autonomous NPC in a game world. Act in character, respond ONLY with JSON actions.',
			input: _question,
			temperature: _temperature ?? 0.9,
		})
		.then((output) => output.output_text);

export const embed: LLMPort.ModelEmbedPort = async (_text, _dimension) =>
	openaiCli.embeddings
		.create({
			model: 'text-embedding-3-large',
			input: _text,
		})
		.then((r) => r.data.map((item) => item.embedding));
