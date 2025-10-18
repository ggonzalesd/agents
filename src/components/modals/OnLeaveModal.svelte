<script lang="ts">
</script>

<div class="flex flex-col gap-2 bg-gray-800 p-4 [direction:reverse]">
	<button
		class="h-10 rounded-md bg-gray-700 px-2 hover:cursor-pointer hover:bg-gray-600"
		onclick={() => {
			history.back();
			location.reload();
		}}
	>
		Leave Game
	</button>
</div>
