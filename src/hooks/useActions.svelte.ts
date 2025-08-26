import { getContext } from 'svelte';
import { writable } from 'svelte/store';

import { Publisher } from '#/utils/Publisher';

export const useActions = () => {
	const stringData = localStorage.getItem('x-actions');
	const __actions = stringData ? JSON.parse(stringData) : [];
	const _actions = Array.isArray(__actions) ? __actions.map(String) : [];

	const { subscribe, update, set } = writable(_actions);

	const publisher = new Publisher();

	const clear = () => {
		localStorage.removeItem('x-actions');
		set([]);
	};

	const add = (action: string) => {
		update((actions) => {
			const newActions = [...new Set([...actions, action])];
			localStorage.setItem('x-actions', JSON.stringify(newActions));
			return newActions;
		});
	};

	const remove = (action: string) => {
		update((actions) => {
			const newActions = actions.filter((a) => a !== action);
			localStorage.setItem('x-actions', JSON.stringify(newActions));
			return newActions;
		});
	};

	return {
		subscribe,
		listen: publisher.listen,
		notify: publisher.notify,
		clear,
		add,
		remove,
	};
};

export const getActionsContext = () => {
	const context = getContext<ReturnType<typeof useActions>>(useActions.name);

	if (!context) {
		throw new Error('Actions context not found');
	}

	return context;
};
