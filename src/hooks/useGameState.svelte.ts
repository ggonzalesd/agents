import { getContext } from 'svelte';
import { writable } from 'svelte/store';

import { Publisher } from '#/utils/Publisher';

type GameType = {
	paused: boolean;
};

export const useGameState = () => {
	let { subscribe, update } = writable<GameType>({
		paused: false,
	});

	const publisher = new Publisher<GameType>();

	const setPause = (value: boolean) =>
		update((state) => {
			const newValue = { ...state, paused: value };
			publisher.publish('game:paused', newValue);
			return newValue;
		});

	return {
		subscribe,
		setPause,
		publisher: { subscribe: publisher.subscribe },
	};
};

export const getGameStateContext = () => {
	const context = getContext<ReturnType<typeof useGameState>>(
		useGameState.name,
	);

	if (!context) {
		throw new Error('Game state context not found');
	}

	return context;
};
