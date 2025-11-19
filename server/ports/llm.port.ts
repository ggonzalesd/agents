export type ModelAskPort = (
	question: string,
	instructions?: string,
	model?: string,
) => Promise<string>;

export type ModelEmbedPort = (
	text: string[],
	dimension?: number,
) => Promise<number[][]>;
