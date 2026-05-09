import { getContext } from 'svelte';
import { writable } from 'svelte/store';

type MessageType = {
	id: string;
	from: string;
	message: string;
	createdAt: Date;
	kind: 'talk' | 'thought';
};

export const useMessageHistory = () => {
	const { subscribe, update } = writable<MessageType[]>([]);

	const addMessage = (id: string, from: string, message: string, kind: 'talk' | 'thought' = 'talk') => {
		update((messages) => {
			if (messages.some((m) => m.id === id)) return messages;

			const newMessage: MessageType = {
				id,
				from,
				message,
				createdAt: new Date(),
				kind,
			};

			return [...messages.slice(-99), newMessage];
		});
	};

	const clearMessages = () => {
		update(() => []);
	};

	return {
		subscribe,
		addMessage,
		clearMessages,
	};
};

export const getMessageHistoryContext = () => {
	const context = getContext<ReturnType<typeof useMessageHistory>>(
		useMessageHistory.name,
	);

	if (!context) {
		throw new Error('Message history context not found');
	}

	return context;
};
