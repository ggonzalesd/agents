import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';

import { defaultMap } from '#/maps/default.map';

import { renderMap } from './render-map.util';

export class RenderClientEcs extends ComponentEcs {
	public scene: THREE.Scene;
	public renderer: THREE.WebGLRenderer;
	public camera: THREE.PerspectiveCamera;

	private raycaster = new THREE.Raycaster();
	private mouse = new THREE.Vector2();

	constructor(public canvas: HTMLCanvasElement) {
		super();

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			75,
			canvas.width / canvas.height,
			0.1,
			1000,
		);
		this.renderer = new THREE.WebGLRenderer({ canvas });
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.needsUpdate = true;
		this.renderer.setClearColor(0x000000, 1);

		const onResize = () => {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		};

		onResize();

		window.addEventListener('resize', onResize);
		this.callOnDelete(() => {
			window.removeEventListener('resize', onResize);
		});

		this.scene.add(new THREE.AxesHelper(1));

		renderMap(this.scene);

		this.camera.position.z = 5;
		this.camera.position.y = 5;

		this.camera.lookAt(0, 0, 0);

		this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
		directionalLight.castShadow = true;
		directionalLight.position.set(1, 1, 0);
		this.scene.add(directionalLight);

		const pointLight = new THREE.PointLight(0xffffff, 20, 1500);
		pointLight.castShadow = true;
		pointLight.position.set(0, 2.5, 0);

		this.scene.add(pointLight);
	}

	onStart(): void {
		const clickEventListener = (event: MouseEvent) => {
			this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

			this.raycaster.setFromCamera(this.mouse, this.camera);

			const intersects = this.raycaster.intersectObjects(
				this.scene.children,
				true,
			);

			for (const intersect of intersects) {
				const userData = intersect?.object?.userData;
				if (userData == null) continue;
				if (!userData.canInteract) continue;

				if (userData.isItem) {
					this.world.stacker.stackLoss('item-interact', userData.parent);
					break;
				}

				// Open entity details when clicking on NPCs or Players
				if (userData.isEntity) {
					this.world.stacker.stackLoss('entity-interact', userData.parent);
					break;
				}
			}
		};

		const bindedClickListener = clickEventListener.bind(this);

		window.addEventListener('click', bindedClickListener);

		this.callOnDelete(() => {
			window.removeEventListener('click', bindedClickListener);
		});

		for (let i = 0; i < defaultMap.grid.length; i++) {
			for (let j = 0; j < defaultMap.grid[i].length; j++) {
				const cell = defaultMap.grid[i][j];
				if (cell === 1) {
					const geometry = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
					const material = new THREE.MeshBasicMaterial({
						color: 0x22af22,
						wireframe: true,
					});
					const plane = new THREE.Mesh(geometry, material);
					plane.rotation.x = -Math.PI / 2;
					plane.position.set(
						0.5 + j - defaultMap.grid[i].length / 2,
						0.5,
						0.5 + i - defaultMap.grid.length / 2,
					);
					this.scene.add(plane);
				}
			}
		}
	}

	onLoop(_delta: number): void {
		this.renderer.clearColor();
		this.renderer.render(this.scene, this.camera);
	}
}
