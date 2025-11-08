<script lang="ts">
	import { getContext, setContext, type Snippet } from 'svelte';
	import { getRouterContext } from '@/hooks/useRouter.svelte';

	interface Props {
		route: string;
		children?: Snippet;
	}

	const { route, children }: Props = $props();

	const routerStack = getContext<string | null>('app-router-stack');
	let routerContext = getRouterContext();

	const currentRoute = (routerStack ?? '') + route;

	setContext('app-router-stack', currentRoute);
</script>

{#if $routerContext.route.startsWith(currentRoute)}
	{@render children?.()}
{/if}
