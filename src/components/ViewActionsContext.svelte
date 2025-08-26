<svelte:options runes />

<script lang="ts">
	import { getActionsContext } from '@/hooks/useActions.svelte';
	import InputText from './InputText.svelte';

	let actionContext = getActionsContext();
	let newValue = $state('');
</script>

<div class="absolute top-8 left-0 z-20 flex flex-col gap-2 p-4">
	<div>View Actions Context</div>
	<div>
		<InputText bind:value={newValue} />
		<button
			onclick={() => {
				actionContext.add(newValue);
				newValue = '';
			}}>Add</button
		>
	</div>
	<div class="flex flex-col gap-2">
		{#each $actionContext as action}
			<div class="flex items-center gap-2">
				<div class="flex flex-col">
					<button
						class="bg-red-700/20 p-1 text-xs hover:cursor-pointer hover:bg-red-600/50"
						onclick={() => actionContext.remove(action)}>Remove</button
					>
					<button
						class="bg-green-700/20 p-1 text-xs hover:cursor-pointer hover:bg-green-600/50"
						onclick={() => actionContext.notify(action)}>Notify</button
					>
				</div>
				<div>{action}</div>
			</div>
		{/each}
	</div>
</div>
