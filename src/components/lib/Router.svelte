<script lang="ts">
	import { type Snippet } from 'svelte';
	import { getRouterContext } from '@/hooks/useRouter.svelte';

	interface Props {
		route?: string;
		children?: Snippet;
	}

	let routerContext = getRouterContext();

	let { route, children }: Props = $props();

	if (route) {
		routerContext.registerRoute(route);
	}
</script>

{#if route == null || route === $routerContext.route}
	{@render children?.()}
{/if}
