export type ModelAskPort = (
	question: string,
	instructions?: string,
	model?: string,
	temperature?: number,
) => Promise<string>;

export type ModelEmbedPort = (
	text: string[],
	dimension?: number,
) => Promise<number[][]>;
