import { getContext } from 'svelte';
import { writable } from 'svelte/store';

export const useRouter = (initRoute: string = '/') => {
	const { subscribe, update } = writable({
		route: initRoute,
		data: null! as any,
	});

	const changeRoute = (route: string, data: any = null) => {
		update((state) => {
			state.route = route;
			state.data = data;
			return state;
		});
	};

	return { subscribe, changeRoute };
};

export const getRouterContext = () => {
	const context = getContext<ReturnType<typeof useRouter>>(useRouter.name);

	if (!context) {
		throw new Error('Router context not found');
	}

	return context;
};
