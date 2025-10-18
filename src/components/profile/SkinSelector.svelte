<script lang="ts">
	import * as THREE from 'three';
	import { GLTFLoader } from 'three-stdlib';
	import { get } from 'svelte/store';

	import { loadTexture, preloadGLB } from '@/utils/assets.utils';
	import Loading from '@/views/Loading.svelte';
	import { uploadSkinService } from '@/services/api.service';
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import { onMount } from 'svelte';
	import axios from 'axios';

	let gameStateContext = getGameStateContext();

	let retry = $state(0);

	function canvasAttach(canvas: HTMLCanvasElement) {
		const username = get(gameStateContext).username as string;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
		const renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));

		// Medir el padre del canvas y ajustar cámara + renderer
		const parentEl = canvas.parentElement as HTMLElement | null;
		const getParentSize = () => {
			if (parentEl) {
				const rect = parentEl.getBoundingClientRect();
				const size = Math.max(1, Math.floor(rect.height)); // usar altura del padre (mínimo 1)
				return { width: 450, height: size };
			}
			// Fallback si no hay padre o no tiene altura todavía
			const fallback = Math.max(1, canvas.clientHeight || 450);
			return { width: fallback, height: fallback };
		};

		const applySize = () => {
			const { width, height } = getParentSize();
			renderer.setSize(width, height);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		};

		applySize();
		const resizeObserver = new ResizeObserver(() => applySize());
		if (parentEl) resizeObserver.observe(parentEl);
		const onWindowResize = () => applySize();
		window.addEventListener('resize', onWindowResize);

		const light = new THREE.DirectionalLight(0xffffff, 1);
		light.position.set(5, 5, 5).normalize();
		scene.add(light);

		const ambientLight = new THREE.AmbientLight(0x707070, 1); // soft white light
		scene.add(ambientLight);

		const modelSpot = new THREE.Object3D();
		scene.add(modelSpot);

		let texture = loadTexture(
			import.meta.env.VITE_API_URL +
				'/api/v1/skin/rand/' +
				Date.now() +
				'/' +
				username +
				'.png?_=' +
				Date.now(),
		);
		const material = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			map: texture,
			transparent: true,
		});

		axios
			.get(import.meta.env.VITE_API_URL + '/api/v1/skin/exists/' + username)
			.catch((error) => {
				texture = loadTexture('/3d/gordon.png', false);
				material.map = texture;
				material.needsUpdate = true;
			});

		let mixer: THREE.AnimationMixer | null = null;

		const loader = new GLTFLoader();
		loader.load(
			'/3d/SkinModel.glb',
			(gltf) => {
				modelSpot.add(gltf.scene);
				gltf.scene.rotation.y = (3 * Math.PI) / 2; // Rotate model to face camera
				gltf.scene.position.y = -1; // Adjust model position if needed
				gltf.scene.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						(child as THREE.Mesh).material = material;
					}
				});

				if (gltf.animations && gltf.animations.length) {
					mixer = new THREE.AnimationMixer(gltf.scene);
					const action = mixer.clipAction(gltf.animations[1]);
					action.play();
				}
			},
			undefined,
			(error) => {
				console.error('An error happened while loading the model:', error);
			},
		);

		camera.position.z = 2;

		const clock = new THREE.Clock();

		let requestId = 0;
		function animate() {
			requestId = requestAnimationFrame(animate);
			renderer.render(scene, camera);

			modelSpot.rotation.y += 0.01; // Rotate model for some animation
			const delta = clock.getDelta();

			if (mixer) {
				mixer.update(delta * 0.5);
			}
		}
		animate();

		return () => {
			cancelAnimationFrame(requestId);
			resizeObserver.disconnect();
			window.removeEventListener('resize', onWindowResize);
			texture.dispose();
			renderer.dispose();
		};
	}

	async function handleOnChange(event: Event) {
		const input = event.target as HTMLInputElement;

		if (!(input && input.files)) {
			return;
		}
		const file = input.files[0];

		const response = await uploadSkinService(file);

		if (response.ok) {
			console.log('Skin uploaded successfully');
			window.location.reload();
			return;
		} else {
			console.error('Error uploading skin:', response.message);
			return;
		}
	}
</script>

{#key retry}
	{#await preloadGLB('/3d/SkinModel.glb')}
		<Loading />
	{:then models}
		<div class="relative flex h-full justify-center">
			<canvas
				class="drop-shadow-2xl drop-shadow-rose-700/25"
				{@attach canvasAttach}
			>
			</canvas>

			<label
				class="bg-magenta-700 font-space-mono pointer-events-auto absolute bottom-0 inline-flex h-14 rounded-md px-10 py-4 text-xl font-bold hover:cursor-pointer"
			>
				<span>Select Skin</span>
				<input onchange={handleOnChange} type="file" class="sr-only" />
			</label>
		</div>
	{:catch error}
		<div class="flex flex-col items-center gap-4">
			<p>Error loading model: {JSON.stringify(error)}</p>
			<button
				class="pointer-events-auto cursor-pointer rounded-md bg-rose-500 px-4 py-2 text-white hover:bg-rose-600"
				onclick={() => retry++}
			>
				Retry Preload
			</button>
		</div>
	{/await}
{/key}
