import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';

export class RenderClientEcs extends ComponentEcs {
	public scene: THREE.Scene;
	public renderer: THREE.WebGLRenderer;
	public camera: THREE.PerspectiveCamera;

	constructor(canvas: HTMLCanvasElement) {
		super();

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			75,
			canvas.width / canvas.height,
			0.1,
			1000,
		);
		this.renderer = new THREE.WebGLRenderer({ canvas });
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

		this.camera.position.z = 5;
		this.camera.position.y = 5;

		this.camera.lookAt(0, 0, 0);

		this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
		directionalLight.position.set(1, 1, 0);
		this.scene.add(directionalLight);

		const pointLight = new THREE.PointLight(0xffffff, 5, 1500);
		pointLight.position.set(0, 2.5, 0);

		this.scene.add(pointLight);

		// Plane
		const plane = new THREE.Mesh(
			new THREE.PlaneGeometry(100, 100),
			new THREE.MeshStandardMaterial({
				color: 0x404040,
				side: THREE.DoubleSide,
			}),
		);
		plane.rotateX(-Math.PI / 2);
		this.scene.add(plane);
	}

	onStart(): void {}

	onLoop(_delta: number): void {
		this.renderer.clearColor();

		this.renderer.render(this.scene, this.camera);
	}
}
