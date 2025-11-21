export interface ExperimentRetrievalResults {
	id: string;
	createdAt: Date;
	npcId: string;

	queryMessage: string;
	resultsMessages: string;
	llmRetrievalScore: number;
}

export interface ExperimentVariabilityResults {
	id: string;
	createdAt: Date;
	npcId: string;

	delayInMs: number;
	// Number of generated actions during the experiment
	actionsGenerated: number;
	// Number of failed and successful actions
	failedActions: number;
	// Number of successful actions
	successfulActions: number;
}

export interface ExperimentHallucinationResults {
	id: string;
	createdAt: Date;
	npcId: string;

	// Information that was supposed to be in the NPC's memory
	relatedInfoInMemory: string;
	// Message that the NPC generated
	message: string;
	// Score indicating the level of hallucination in the message
	llmHallucinationScore: number;
}
