import * as OpenAIService from './openai.service';

export const ask: (
	_question: string,
	_instructions?: string,
) => Promise<string> = OpenAIService.ask;

export const embed: (
	_text: string[],
	dimension: number,
) => Promise<number[][]> = (_text: string[], _dimension: number) => {
	throw new Error('Not implemented');
};
