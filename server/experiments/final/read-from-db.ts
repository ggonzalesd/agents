import { PrismaClient } from '$/generated/prisma/client';
import env from '$/config/env.config';

const prisma = new PrismaClient();

async function main() {
	console.log('Reading from database at', env.DB_NAME);

	const hallucinations = await prisma.experimentHallucinationResults
		.findMany({
			select: {
				llmHallucinationScore: true,
			},
		})
		.then((results) => results.map((r) => r.llmHallucinationScore))
		.then((scores) => scores.reduce((a, b) => a + b, 0) / scores.length);

	console.log('Average LLM Hallucination Score:', hallucinations);

	const retrievals = await prisma.experimentRetrievalResults
		.findMany({
			select: {
				llmRetrievalScore: true,
			},
		})
		.then((results) => results.map((r) => r.llmRetrievalScore))
		.then((scores) => scores.reduce((a, b) => a + b, 0) / scores.length);

	console.log('Average LLM Retrieval Score:', retrievals);

	const variabilityRaw = await prisma.experimentVariabilityResults.findMany({
		select: {
			delayInMs: true,
			actionsGenerated: true,
			failedActions: true,
			successfulActions: true,
		},
	});

	const variability = variabilityRaw.map((v) => ({
		...v,
	}));

	let totalActions = 0;
	let totalFailed = 0;
	let totalSuccessful = 0;

	for (const v of variability) {
		totalActions += v.actionsGenerated;
		totalFailed += v.failedActions;
		totalSuccessful += v.successfulActions;
	}

	console.log('Total Actions Generated:', totalActions);
	console.log('Total Successful Actions:', totalSuccessful);
	console.log('Total Failed Actions:', totalFailed);
	console.log(
		'Overall Success Rate:',
		(totalSuccessful / totalActions) * 100,
		'%',
	);

	let actions = 0;
	for (const v of variability) {
		actions += v.actionsGenerated;
	}

	console.log(
		'Average Actions Generated per Entry:',
		actions / variability.length,
	);

	let overallDelay = 0;
	for (const v of variability) {
		overallDelay += v.delayInMs;
	}

	overallDelay = overallDelay / variability.length;

	console.log('Average Delay in ms:', overallDelay);
}

main();
