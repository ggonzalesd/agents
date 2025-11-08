<script lang="ts" module>
	import User from '@lucide/svelte/icons/user';
	import BotIcon from '@lucide/svelte/icons/bot';

	// This is sample data.
	const data = {
		user: {
			name: 'shadcn',
			email: 'm@example.com',
			avatar: '/avatars/shadcn.jpg',
		},
		teams: [
			{
				name: 'Acme Inc',
				logo: User,
				plan: 'Enterprise',
			},
		],
		navMain: [
			{
				title: 'NPCs',
				url: '#',
				icon: BotIcon,
				items: [
					{
						title: 'Crear',
						url: '/admin/npcs/create',
					},
					{
						title: 'Listar',
						url: '/admin/npcs/list',
					},
				],
			},
			{
				title: 'Users',
				url: '#',
				icon: User,
				items: [
					{
						title: 'Crear',
						url: '#',
					},
					{
						title: 'Listar',
						url: '#',
					},
				],
			},
		],
	};
</script>

<script lang="ts">
	import NavMain from './nav-main.svelte';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import TeamSwitcher from './team-switcher.svelte';
	import * as Sidebar from '@lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<TeamSwitcher teams={data.teams} />
	</Sidebar.Header>

	<Sidebar.Content>
		<NavMain items={data.navMain} />
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton tooltipContent="Log out">
					<LogOutIcon />
					Log out
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>
