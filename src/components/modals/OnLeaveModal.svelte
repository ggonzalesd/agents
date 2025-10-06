<script lang="ts">
</script>

<div class="flex flex-col gap-2 bg-gray-800 p-4 [direction:reverse]">
	<button class="bg-gray-700 h-10 px-2 rounded-md hover:bg-gray-600 hover:cursor-pointer"
		onclick={() => {
			history.back();
			location.reload();
		}}
	>
		Leave Game
	</button>
</div>
