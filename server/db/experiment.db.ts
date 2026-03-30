import prisma from '$/config/prisma.config';

export const saveExperimentRetrievalResults = async ({
	npcId,
	queryMessage,
	resultsMessages,
}: {
	npcId: string;
	queryMessage: string;
	resultsMessages: string;
}): Promise<void> => {
	await prisma.experimentRetrievalResults.create({
		data: { npcId, queryMessage, resultsMessages, llmRetrievalScore: 0.0 },
	});
};

export const saveExperimentVariabilityResults = async ({
	npcId,
	delayInMs,
	actionsGenerated,
	failedActions,
	successfulActions,
}: {
	npcId: string;
	delayInMs: number;
	actionsGenerated: number;
	failedActions: number;
	successfulActions: number;
}): Promise<void> => {
	await prisma.experimentVariabilityResults.create({
		data: {
			npcId,
			delayInMs,
			actionsGenerated,
			failedActions,
			successfulActions,
		},
	});
};

export const saveExperimentHallucinationResults = async ({
	npcId,
	relatedInfoInMemory,
	message,
}: {
	npcId: string;
	relatedInfoInMemory: string;
	message: string;
}): Promise<void> => {
	await prisma.experimentHallucinationResults.create({
		data: { npcId, relatedInfoInMemory, message, llmHallucinationScore: 0.0 },
	});
};
