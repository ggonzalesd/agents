<svelte:options runes />

<script lang="ts">
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import { getContext } from 'svelte';
	import type { Option } from '#/utils/Option';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { RecordEcs } from '#/ecs/lib/Record.ecs';
	import type { PlayerState } from '#/state/player.state';
	import type { NPCState } from '#/state/game.state';
	import * as THREE from 'three';
	import { cloneMesh, loadGLB, loadTexture } from '@/utils/assets.utils';

	let gameState = getGameStateContext();

	// Access ECS world to read the selected entity state
	const worldOp = getContext<Option<WorldEcs>>(WorldEcs.name);

	// Derive selected entity data
	let skin = $state<string | null>(null);
	let title = $state('Entity Details');

	let viewer = $state<{ setSkin: (s: string | null) => void } | null>(null);

	function skinUrl(s: string | null): string {
		if (s && s.trim().length > 0) {
			return `${import.meta.env.VITE_API_URL}/api/v1/skin/${s}.png`;
		}
		return '/3d/gordon.png';
	}

	function modelAttach(canvas: HTMLCanvasElement) {
		// Scene setup
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
		const renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));

		// Sizing
		const parentEl = canvas.parentElement as HTMLElement | null;
		const applySize = () => {
			if (!parentEl) return;
			const width = parentEl.clientWidth;
			const height = parentEl.clientHeight;
			renderer.setSize(width, height);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		};

		setTimeout(applySize, 0);
		const resizeObserver = new ResizeObserver(applySize);
		if (parentEl) resizeObserver.observe(parentEl);
		window.addEventListener('resize', applySize);

		// Lights
		scene.add(new THREE.AmbientLight(0xffffff, 0.7));
		const dir = new THREE.DirectionalLight(0xffffff, 1);
		dir.position.set(3, 5, 3);
		scene.add(dir);

		// Model
		const texture = loadTexture(skinUrl(skin), false);
		const material = new THREE.MeshStandardMaterial({
			map: texture,
			transparent: true,
		});
		const { mesh, mixer } = cloneMesh(loadGLB('/3d/SkinModel.glb'), material, [
			'IDLE',
			'WALK',
		]);
		const spot = new THREE.Object3D();
		spot.add(mesh);
		scene.add(spot);
		mesh.position.set(0, -1, 0);
		mesh.rotateY(Math.PI / 2);

		camera.position.z = 2.25;

		// Animation loop
		const clock = new THREE.Clock();
		let raf = 0;
		const animate = () => {
			raf = requestAnimationFrame(animate);
			spot.rotation.y += 0.01;
			const dt = clock.getDelta();
			mixer.update(dt * 0.5);
			renderer.render(scene, camera);
		};
		animate();

		viewer = {
			setSkin: (s: string | null) => {
				const tex = loadTexture(skinUrl(s), false);
				material.map = tex;
				material.needsUpdate = true;
			},
		};

		return () => {
			cancelAnimationFrame(raf);
			resizeObserver.disconnect();
			window.removeEventListener('resize', applySize);
			renderer.dispose();
			material.map?.dispose?.();
			material.dispose();
		};
	}

	$effect(() => {
		const world = worldOp?.raw();
		const selectedId = $gameState.selectedEntityId;

		skin = null;
		title = 'Entity Details';

		if (!world || !selectedId) return;

		const entity = world.getEntity(selectedId).raw();
		const record = entity?.getUnsafe(RecordEcs)?.getRecord('state') as
			| PlayerState
			| NPCState
			| undefined;

		if (!record) return;

		// Both PlayerState and NPCState have 'skin'
		// For title we distinguish by shape (PlayerState has 'sessionId')
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const anyRecord: any = record;
		if ('sessionId' in anyRecord) {
			title = `Player (${selectedId})`;
		} else {
			title = `NPC (${selectedId})`;
		}

		skin = record.skin ?? null;
		// Update viewer texture if already mounted
		viewer?.setSkin(skin);
	});
</script>

<div
	class="text-gris-50 flex w-[400px] flex-col gap-6 rounded-lg bg-[url(/background-entity-information.svg)] bg-cover bg-center bg-no-repeat p-6 md:w-[550px]"
>
	<h1 class="text-center text-2xl font-bold">{title}</h1>

	<div
		class="flex min-h-[320px] flex-col items-center justify-between gap-6 md:flex-row"
	>
		<div class="flex min-h-[300px] w-full md:w-2/5">
			<canvas class="h-full w-full" {@attach modelAttach}></canvas>
		</div>

		<div
			class="border-gris-50 text-gris-50 flex w-full flex-col gap-1.5 rounded-lg border p-4 md:w-3/5"
		>
			{#each [['Health (HP)', '100 / 100'], ['Hunger (Food)', '75 / 100'], ['Stade', 'Happy'], ['Nº Missions', '12'], ['Nº Achievements', '14']] as stat, index}
				<div class="flex justify-between">
					<p class="text-md font-bold">{stat[0]}</p>
					<p class="text-sm">{stat[1]}</p>
				</div>
				{#if index !== 4}
					<hr class="border-gris-50" />
				{/if}
			{/each}
		</div>
	</div>

	<p class="text-center text-sm">
		Detalles de la entidad seleccionada. (Contenido de ejemplo)
	</p>
</div>
