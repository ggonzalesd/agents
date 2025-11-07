<script lang="ts">
	import * as DropdownMenu from '@lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '@lib/components/ui/sidebar/index.js';
	import { useSidebar } from '@lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';

	// This should be `Component` after @lucide/svelte updates types
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { teams }: { teams: { name: string; logo: any; plan: string }[] } =
		$props();
	const sidebar = useSidebar();

	let activeTeam = $state(teams[0]);
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-gris-700 data-[state=open]:text-gris-50"
					>
						<div
							class="bg-azul-600 text-gris-50 flex aspect-square size-8 items-center justify-center rounded-lg"
						>
							<activeTeam.logo class="size-4" />
						</div>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">
								{activeTeam.name}
							</span>
							<span class="truncate text-xs">{activeTeam.plan}</span>
						</div>
						<ChevronsUpDownIcon class="ml-auto" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
