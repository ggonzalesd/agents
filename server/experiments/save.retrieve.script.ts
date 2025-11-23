import fs from 'node:fs';

import { PrismaClient } from '$/generated/prisma/client';
import env from '$/config/env.config';

const prisma = new PrismaClient();

const map = {
	game_gpt_5_mini: 'retrieval_gpt-5-mini_',
	game_gpt_4_1: 'retrieval_gpt-4.1_',
	game_gpt_4_1_mini: 'retrieval_gpt-4.1-mini_',
	game_gpt_4_1_nano: 'retrieval_gpt-4.1-nano_',
} as Record<string, string>;

async function saveExperimentScript() {
	const filenameStart = map[env.DB_NAME];

	console.log(env.DB_NAME);
	console.log(`Looking for experiment scripts starting with: ${filenameStart}`);

	const file = fs.globSync(
		`server/experiments/results/retrieval/${filenameStart}*.jsonl`,
	)[0];

	if (!file) {
		console.error('No matching experiment script found.');
		return;
	}

	const data = fs.readFileSync(file, 'utf-8');
	const lines = data.split('\n').filter(Boolean);

	for (const line of lines) {
		const experiment = JSON.parse(line) as {
			id: string;
			custom_id: string;
			response: {
				status_code: number;
				body: {
					id: string;
					status: string;
					model: string;
					output: Array<{
						id: string;
						type: string;
						status: string;
						content: Array<{
							type: string;
							text: string;
						}>;
					}>;
				};
			};
		};

		const [_, __, ___, uuid] = experiment.custom_id.split('/') as [
			string,
			string,
			string,
			string,
		];

		const value = experiment.response.body.output[0].content
			.map((c) => c.text)
			.join('\n');

		console.log(`Processing experiment with UUID: ${uuid}`);
		console.log(`Generated value: ${value}`);
		console.log('---');

		await prisma.experimentRetrievalResults.updateMany({
			where: {
				id: uuid,
			},
			data: {
				llmRetrievalScore: Number(value),
			},
		});
	}
}

saveExperimentScript();
