import { getContext } from 'svelte';
import { writable } from 'svelte/store';

import { Publisher } from '#/utils/Publisher';

type GameType = {
	paused: boolean;
	showNpcPaths: boolean;
	view:
		| 'MENU'
		| 'MESSAGE'
		| 'INFO'
		| 'INVENTORY'
		| 'ONLEAVE'
		| 'ENTITYDETAILS'
		| 'MISSIONS'
		| 'DIALOGUE';
	username: string;
	selectedEntityId: string | null;
	dialogueNpcEntityId: string | null;
};

const NPC_PATHS_STORAGE_KEY = 'x-show-npc-paths';

const getInitialShowNpcPaths = () => {
	if (typeof window === 'undefined') {
		return true;
	}

	return localStorage.getItem(NPC_PATHS_STORAGE_KEY) !== '0';
};

export const useGameState = () => {
	const { subscribe, update } = writable<GameType>({
		paused: false,
		showNpcPaths: getInitialShowNpcPaths(),
		view: 'MENU',
		username: '',
		selectedEntityId: null,
		dialogueNpcEntityId: null,
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

	const continueGame = () => {
		update((state) => {
			const newValue = { ...state, paused: false };
			publisher.publish('game:continue', newValue);
			return newValue;
		});
	};

	const setSelectedEntity = (id: string | null) => {
		update((state) => {
			const newValue = { ...state, selectedEntityId: id };
			publisher.publish('game:selected-entity', newValue);
			return newValue;
		});
	};

	const setDialogueNpc = (npcEntityId: string | null) => {
		update((state) => {
			const newValue = { ...state, dialogueNpcEntityId: npcEntityId };
			publisher.publish('game:dialogue-npc', newValue);
			return newValue;
		});
	};

	const setShowNpcPaths = (showNpcPaths: boolean) => {
		if (typeof window !== 'undefined') {
			localStorage.setItem(NPC_PATHS_STORAGE_KEY, showNpcPaths ? '1' : '0');
		}

		update((state) => {
			const newValue = { ...state, showNpcPaths };
			publisher.publish('game:npc-paths', newValue);
			return newValue;
		});

		return showNpcPaths;
	};

	const toggleNpcPaths = () => {
		let nextValue = true;
		update((state) => {
			nextValue = !state.showNpcPaths;
			if (typeof window !== 'undefined') {
				localStorage.setItem(NPC_PATHS_STORAGE_KEY, nextValue ? '1' : '0');
			}

			const newValue = { ...state, showNpcPaths: nextValue };
			publisher.publish('game:npc-paths', newValue);
			return newValue;
		});

		return nextValue;
	};

	return {
		subscribe,
		setPause,
		continueGame,
		setUsername,
		setSelectedEntity,
		setDialogueNpc,
		setShowNpcPaths,
		toggleNpcPaths,
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
