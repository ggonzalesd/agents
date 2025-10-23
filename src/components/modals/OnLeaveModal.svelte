<script lang="ts">
	import { onMount } from 'svelte';

	function handleLeave() {
		location.reload();
	}

	onMount(() => {
		const timeout = setTimeout(
			() => {
				handleLeave();
			},
			import.meta.env.VITE_AUTO_JOIN === 'true' ? 3000 : 10000,
		);

		return () => {
			clearTimeout(timeout);
		};
	});
</script>

<div class="flex flex-col gap-2 bg-gray-800 p-4 [direction:reverse]">
	<button
		class="h-10 rounded-md bg-gray-700 px-2 hover:cursor-pointer hover:bg-gray-600"
		onclick={handleLeave}
	>
		Leave Game
	</button>
</div>
