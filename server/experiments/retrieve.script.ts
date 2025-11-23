import { PrismaClient } from '$/generated/prisma/client';
import openaiCli from '$/config/openai.config';

const prisma = new PrismaClient();

const keyquery = Math.random().toString(36).substring(2, 15);

async function retrieveExperiments() {
	const results = await prisma.experimentRetrievalResults.findMany({
		select: {
			id: true,
			queryMessage: true,
			resultsMessages: true,
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
			'- You just answered if the retrieved documents are relevant to the question.',
			'- The answer must be a float number between 0 and 1, where 1 is very relevant and 0 is not relevant at all.',
			'- JUST ANSWER WITH THE NUMBER, NO EXTRA TEXT.',
			'- You get "INPUT MESSAGE" and "OUTPUT MESSAGES" sections below.',
			'',
			'# INPUT MESSAGE',
			r.queryMessage,
			'# OUTPUT MESSAGES',
			r.resultsMessages,
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

	const file = new File([blob], `retrieval_experiments_${keyquery}.jsonl`);

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
