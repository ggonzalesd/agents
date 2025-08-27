import { GameInputs } from 'game-inputs';
import { getContext } from 'svelte';

export const useGameInput = (element: HTMLElement) => {
	const input = new GameInputs(element, {
		preventDefaults: true,
		allowContextMenu: false,
		stopPropagation: true,
		disabled: false,
	});

	console.log(element);

	input.bind('move-fwd', 'KeyW');
	input.bind('move-back', 'KeyS');
	input.bind('move-left', 'KeyA');
	input.bind('move-right', 'KeyD');

	input.bind('jump', 'Space');

	type GameInputs =
		| 'move-fwd'
		| 'move-back'
		| 'move-left'
		| 'move-right'
		| 'jump';

	return {
		input,
		press: input.state as Record<GameInputs, boolean>,
		get down() {
			return input.pressCount as Record<GameInputs, number>;
		},
		get up() {
			return input.releaseCount as Record<GameInputs, number>;
		},
		tick: input.tick.bind(input),
	};
};

export const getGameInputContext = () => {
	const context = getContext<ReturnType<typeof useGameInput>>(
		useGameInput.name,
	);

	if (!context) {
		throw new Error('Game Input context not found');
	}

	return context;
};
