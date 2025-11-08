<script lang="ts">
	import { getContext, onMount } from 'svelte';

	import { GameInput } from '@/utils/input.utils';

	import * as HOOKS from '@/hooks';

	import Button from '@/components/ui/Button.svelte';
	import SkinSelector from '@/components/profile/SkinSelector.svelte';

	let router = HOOKS.getRouterContext();
	let gameInputContext = getContext<GameInput>(GameInput.name);

	onMount(() => {
		gameInputContext.disabled = true;

		const timeout = setTimeout(() => {
			if (import.meta.env.VITE_AUTO_JOIN === 'true')
				router.changeRoute('/game');
		}, 1000);

		return () => {
			clearTimeout(timeout);
		};
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

{#snippet renderUserInformation(title: string, description: string)}
	<div class="text-gris-50 font-space-mono flex flex-col gap-2">
		<p class="text-[12px] font-bold">{title}</p>
		<p class="text-[14px]">{description}</p>
	</div>
{/snippet}

{#snippet renderLists(name: string, data?: string[][] | null)}
	{#if data && data.length > 0}
		<div
			class="font-space-mono flex max-h-[180px] flex-col gap-2 overflow-y-auto"
		>
			<p class="text-center text-[16px] font-bold">{name}</p>

			{#each data as item, index}
				<div
					class="text-gris-50 font-space-mono flex flex-col gap-2 rounded-lg px-5 py-2.5"
					class:bg-azul-900={index % 2 === 0}
					class:bg-magenta-900={index % 2 !== 0}
				>
					<p class="text-[14px] font-bold">{item[0]}</p>
					<div class="flex w-full justify-between">
						<p class="text-[14px]">{item[1]}</p>
						<p class="text-gris-200 text-[14px]">{item[2]}</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}
{/snippet}

<section
	class="flex h-screen w-full flex-col items-center justify-between gap-8 overflow-auto bg-[url(/background-profile.png)] bg-cover bg-center bg-no-repeat p-10"
>
	<h1 class="font-zen-dots text-center text-2xl">Account information</h1>
	<div
		class=" flex h-full w-full flex-col items-center gap-8 lg:max-w-4xl xl:max-w-7xl xl:flex-row"
	>
		<div class="flex h-full flex-1 justify-center">
			<SkinSelector />
		</div>

		<div class="flex h-full w-full flex-1 flex-col justify-between gap-2">
			<div class="font-space-mono flex flex-col gap-2">
				<p class="text-center text-[16px] font-bold">Player information</p>

				<div class="flex w-full justify-between">
					{@render renderUserInformation('Username', 'CristianMauricio')}
					{@render renderUserInformation('Age', '23 años')}
				</div>
				{@render renderUserInformation(
					'About',
					'Estudiante de ciencias de la computación en la UPC',
				)}
			</div>

			{@render renderLists('Logros completados', [
				['First Steps', 'Completed the tutorial', '01/01/2024'],
				['Explorer', 'Visited all areas', '15/02/2024'],
				['Collector', 'Collected 100 items', '20/03/2024'],
			])}

			{@render renderLists('Misiones completadas', [
				['Games Played', '150', 'N/A'],
				['Highest Score', '2000', 'N/A'],
				['Total Playtime', '300 hours', 'N/A'],
			])}

			<div class="flex w-full flex-row items-center justify-center gap-8">
				<Button type="button" onclick={() => router.changeRoute('/game')}>
					Go to Game
				</Button>

				<Button type="button" onclick={logoutHandler}>Logout</Button>

				<Button
					type="button"
					onclick={() => router.changeRoute('/admin/npcs/list')}
				>
					Go To Admin
				</Button>
			</div>
		</div>
	</div>
</section>
