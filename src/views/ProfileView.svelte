<script lang="ts">
	import SkinSelector from '@/components/profile/SkinSelector.svelte';
	import { getRouterContext } from '@/hooks/useRouter.svelte';

	let router = getRouterContext();
</script>

<section class="flex flex-col items-center gap-4 p-4">
	<h1>Profile View</h1>
	<div class="flex">
		<SkinSelector />
		<button
			class="pointer-events-auto"
			onclick={() => router.changeRoute('/game')}
		>
			Go to Game
		</button>
	</div>
</section>
