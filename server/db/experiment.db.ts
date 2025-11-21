import type { ExperimentRetrievalResults } from '$/generated/prisma/client';
import type {
	ExperimentHallucinationResults,
	ExperimentVariabilityResults,
} from '$/models/Experiment.model';
import * as SQL from '$/utils/sql';

type SaveExperimentRetrievalResultsType = SQL.InferSqlBuilder<
	{
		npcId: string;

		queryMessage: string;
		resultsMessages: string;
	},
	void
>;

export const saveExperimentRetrievalResults: SaveExperimentRetrievalResultsType =
	SQL.sqlBuilder(async ({ npcId, queryMessage, resultsMessages }, sql) => {
		await SQL.insertIntoTable<ExperimentRetrievalResults>(
			'ExperimentRetrievalResults',
			{
				npcId,
				queryMessage,
				resultsMessages,
				llmRetrievalScore: 0.0,
			},
			sql,
		);
	});

type SaveExperimentVariabilityResultsType = SQL.InferSqlBuilder<
	{
		npcId: string;

		delayInMs: number;
		actionsGenerated: number;
		failedActions: number;
		successfulActions: number;
	},
	void
>;

export const saveExperimentVariabilityResults: SaveExperimentVariabilityResultsType =
	SQL.sqlBuilder(
		async (
			{ npcId, delayInMs, actionsGenerated, failedActions, successfulActions },
			sql,
		) => {
			await SQL.insertIntoTable<ExperimentVariabilityResults>(
				'ExperimentVariabilityResults',
				{
					npcId,
					delayInMs,
					actionsGenerated,
					failedActions,
					successfulActions,
				},
				sql,
			);
		},
	);

type SaveExperimentHallucinationResultsType = SQL.InferSqlBuilder<
	{
		npcId: string;

		relatedInfoInMemory: string;
		message: string;
	},
	void
>;

export const saveExperimentHallucinationResults: SaveExperimentHallucinationResultsType =
	SQL.sqlBuilder(async ({ npcId, relatedInfoInMemory, message }, sql) => {
		await SQL.insertIntoTable<ExperimentHallucinationResults>(
			'ExperimentHallucinationResults',
			{
				npcId,
				relatedInfoInMemory,
				message,
				llmHallucinationScore: 0.0,
			},
			sql,
		);
	});
