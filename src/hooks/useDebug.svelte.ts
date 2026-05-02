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

	const updateMessage = (id: string, message: string) => {
		update((messages) =>
			messages.map((msg) => (msg.id === id ? { ...msg, message } : msg)),
		);
	};

	const deleteMessage = (id: string) => {
		update((messages) => messages.filter((msg) => msg.id !== id));
	};

	const add = (
		message: string,
		props?: {
			type: 'error' | 'info' | 'warning';
			isCode: boolean;
			deleteOn?: number;
			imageUrl?: string;
		},
	): string => {
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

		return id;
	};

	const error = (message: string, props?: { isCode?: boolean; imageUrl?: string }) =>
		add(message, { type: 'error', isCode: props?.isCode ?? false, deleteOn: 5000, imageUrl: props?.imageUrl });

	const success = (message: string, props?: { isCode?: boolean; imageUrl?: string }) =>
		add(message, { type: 'info', isCode: props?.isCode ?? false, deleteOn: 5000, imageUrl: props?.imageUrl });

	const warning = (message: string, props?: { isCode?: boolean; imageUrl?: string }) =>
		add(message, { type: 'warning', isCode: props?.isCode ?? false, deleteOn: 5000, imageUrl: props?.imageUrl });

	return { subscribe, add, updateMessage, deleteMessage, error, success, warning };
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
