<script lang="ts">
	import SkinSelector from '@/components/profile/SkinSelector.svelte';
	import { getRouterContext } from '@/hooks/useRouter.svelte';

	let router = getRouterContext();
</script>

<section class="flex h-full w-full flex-col items-center gap-4 p-4">
	<h1>Profile View</h1>
	<div
		class=" flex w-full flex-col items-center gap-4 lg:max-w-4xl xl:max-w-7xl xl:flex-row"
	>
		<div class="flex-1">
			<SkinSelector />
		</div>
		<div class="flex flex-1">
			<button
				class="pointer-events-auto"
				onclick={() => router.changeRoute('/game')}
			>
				Go to Game
			</button>
		</div>
	</div>
</section>
