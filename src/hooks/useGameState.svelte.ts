import { getContext } from 'svelte';
import { writable } from 'svelte/store';

import { Publisher } from '#/utils/Publisher';

type GameType = {
	paused: boolean;
	view: 'MENU' | 'MESSAGE' | 'INFO' | 'INVENTORY';
	username: string;
};

export const useGameState = () => {
	let { subscribe, update } = writable<GameType>({
		paused: false,
		view: 'MENU',
		username: '',
	});

	const publisher = new Publisher<GameType>();

	const setPause = (value: boolean, view: GameType['view'] = 'MENU') =>
		update((state) => {
			const newValue = { ...state, paused: value, view };
			publisher.publish('game:paused', newValue);
			return newValue;
		});

	const setUsername = (username: string) => {
		update((state) => {
			const newValue = { ...state, username };
			publisher.publish('game:username', newValue);
			return newValue;
		});
	};

	return {
		subscribe,
		setPause,
		setUsername,
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
