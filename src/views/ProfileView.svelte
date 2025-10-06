<script lang="ts">
	import SkinSelector from '@/components/profile/SkinSelector.svelte';
	import { getRouterContext } from '@/hooks/useRouter.svelte';
	import { GameInput } from '@/utils/input.utils';
	import { getContext, onMount } from 'svelte';

	let router = getRouterContext();
	let gameInputContext = getContext<GameInput>(GameInput.name);

	onMount(() => {
		gameInputContext.disabled = true;
	});

	function logoutHandler() {
		fetch(import.meta.env.VITE_API_URL + '/api/v1/auth/logout', {
			method: 'POST',
			credentials: 'include',
		}).then(() => {
			window.location.href = '/';
		});
	}
</script>

<section class="flex h-full w-full flex-col items-center gap-4 p-4">
	<h1>Profile View</h1>
	<div
		class=" flex w-full flex-col items-center gap-4 lg:max-w-4xl xl:max-w-7xl xl:flex-row"
	>
		<div class="flex-1">
			<SkinSelector />
		</div>
		<div class="flex flex-1 gap-2">
			<button
				class="pointer-events-auto"
				onclick={() => router.changeRoute('/game')}
			>
				Go to Game
			</button>
			<button
				type='button'
				onclick={logoutHandler}
			> Logout </button>
		</div>
	</div>
</section>

<style>
	button {
		transition: background-color 0.3s ease;
		cursor: pointer;
		border: none;
		border-radius: 0.375rem;
		background-color: #3b82f6;
		padding: 0.5rem 1rem;
		color: white;
		font-size: 1rem;
	}
</style>
