import { writable } from 'svelte/store';

export interface PhaseCountdownEvent {
	userId: string;
	experimentKey: string;
	phaseIndex: number;
	title: string;
	description: string;
}

export interface AwaitingFeedbackEvent {
	userId: string;
	experimentKey: string;
}

export const phaseCountdownEvent = writable<PhaseCountdownEvent | null>(null);
export const awaitingFeedbackEvent = writable<AwaitingFeedbackEvent | null>(null);
