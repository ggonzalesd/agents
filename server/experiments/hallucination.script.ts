import { PrismaClient } from '$/generated/prisma/client';
import openaiCli from '$/config/openai.config';
import env from '$/config/env.config';

const prisma = new PrismaClient();

const keyquery = Math.random().toString(36).substring(2, 15);

async function retrieveExperiments() {
	const results = await prisma.experimentHallucinationResults.findMany({
		select: {
			id: true,
			relatedInfoInMemory: true,
			message: true,
			NPC: {
				select: {
					model: true,
				},
			},
		},
	});

	const requests = results.map((r) => {
		const input = [
			'# SYSTEM',
			'- You just answer if the response contains hallucinated information.',
			'- The answer must be either 0 (no hallucination) or 1 (contains hallucination).',
			'- JUST ANSWER WITH THE NUMBER, NO EXTRA TEXT.',
			'- You get "MEMORY INFO" and "OUTPUT MESSAGES" sections below.',
			'',
			'# MEMORY INFO',
			r.relatedInfoInMemory,
			'# OUTPUT MESSAGES',
			r.message,
		].join('\n');

		return {
			custom_id: `${keyquery}/retrieval/${r.NPC.model}/${r.id}`,
			method: 'POST',
			url: '/v1/responses',
			body: {
				model: 'gpt-4.1-mini',
				input: input,
			},
		};
	});

	const blob = new Blob(
		[requests.map((item) => JSON.stringify(item)).join('\n')],
		{
			type: 'application/jsonl',
		},
	);

	const file = new File(
		[blob],
		`hallucination_experiments_${keyquery}_${env.DB_NAME}.jsonl`,
	);

	const openaiFile = await openaiCli.files.create({
		file: file,
		purpose: 'batch',
	});

	const batch = await openaiCli.batches.create({
		input_file_id: openaiFile.id,
		endpoint: '/v1/responses',
		completion_window: '24h',
	});

	console.log({ openaiFile, batch });
}

retrieveExperiments();
