import { getContext } from 'svelte';
import { writable } from 'svelte/store';

import { v4 as uuidv4 } from 'uuid';

export type DebugItemMessage = {
	id: string;
	type: 'error' | 'info' | 'warning';
	isCode: boolean;
	message: string;
	createdAt: Date;
	imageUrl?: string;
	delete: () => void;
};

export const useDebugHook = () => {
	const { subscribe, update } = writable<Array<DebugItemMessage>>([]);

	const add = (
		message: string,
		props?: {
			type: 'error' | 'info' | 'warning';
			isCode: boolean;
			deleteOn?: number;
			imageUrl?: string;
		},
	) => {
		const id = uuidv4();
		const createdAt = new Date();

		const _props = props ?? { type: 'info', isCode: false, deleteOn: 5000 };
		if (_props.deleteOn == null) {
			_props.deleteOn = 5000;
		}

		const deleteMessage = () => {
			update((messages) => messages.filter((msg) => msg.id !== id));
		};

		if (props?.deleteOn) {
			setTimeout(deleteMessage, props.deleteOn);
		}

		const data = {
			id,
			message,
			createdAt,
			delete: deleteMessage,
			...(props ?? { type: 'info', isCode: false }),
		};

		update((messages) => [...messages, data]);
	};

	return { subscribe, add };
};

export const getDebugContext = () => {
	const context = getContext<ReturnType<typeof useDebugHook>>(
		useDebugHook.name,
	);

	if (!context) {
		throw new Error('Debug context not found');
	}

	return context;
};
