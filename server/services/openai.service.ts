import openaiCli from '$/config/openai.config';

import type * as LLMPort from '$/ports/llm.port';
// import { createReadStream } from 'node:fs';
// import { Readable } from 'node:stream';

async function _test() {
	const file = await openaiCli.files.create({
		file: new File(
			[
				new Blob(
					[
						[
							{
								custom_id: 'q1',
								method: 'POST',
								url: '/v1/responses',
								body: { model: 'gpt-4.1', input: '¿Qué es Docker?' },
							},
							{
								custom_id: 'q2',
								method: 'POST',
								url: '/v1/responses',
								body: { model: 'gpt-4.1', input: '¿Qué es un CDN?' },
							},
							{
								custom_id: 'q3',
								method: 'POST',
								url: '/v1/responses',
								body: { model: 'gpt-4.1', input: 'HTTP vs HTTPS?' },
							},
						]
							.map((item) => JSON.stringify(item))
							.join('\n'),
					],
					{
						type: 'application/jsonl',
					},
				),
			],
			'empty.jsonl',
		),
		purpose: 'batch',
	});

	const batch = await openaiCli.batches.create({
		input_file_id: file.id,
		endpoint: '/v1/responses',
		completion_window: '24h',
	});

	console.log({ file, batch });
}

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
