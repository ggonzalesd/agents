import * as THREE from 'three';
import { Sky } from 'three-stdlib';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { RenderClientEcs } from './renderClient.ecs';

export class SkyboxEcs extends ComponentEcs {
	private sky: Sky | null = null;
	private lastUpdateTime: number = 0;
	private renderClient: RenderClientEcs = null!;

	constructor() {
		super();
	}

	onStart(): void {
		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		this.initialize();
	}

	private initialize(): void {
		this.sky = new Sky();
		this.sky.scale.setScalar(450000);

		this.renderClient.scene.add(this.sky);

		this.callOnDelete(() => {
			if (this.sky) {
				this.renderClient.scene.remove(this.sky);
			}
		});

		this.updateSky();
	}

	private updateSky(): void {
		if (!this.sky) return;

		const now = new Date();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const timeDecimal = hours + minutes / 60;

		let elevation;
		if (timeDecimal >= 6 && timeDecimal <= 18) {
			const progress = (timeDecimal - 6) / 12;
			elevation = Math.sin(progress * Math.PI) * 60 - 10;
		} else {
			elevation = -30;
		}

		const uniforms = this.sky.material.uniforms;
		uniforms['turbidity'].value = 10;
		uniforms['rayleigh'].value = 3;
		uniforms['mieCoefficient'].value = 0.005;
		uniforms['mieDirectionalG'].value = 0.7;

		const phi = THREE.MathUtils.degToRad(90 - elevation);
		const theta = THREE.MathUtils.degToRad(180);

		const sun = new THREE.Vector3();
		sun.setFromSphericalCoords(1, phi, theta);
		uniforms['sunPosition'].value.copy(sun);
	}

	onLoop(_delta: number): void {
		const currentTime = Date.now();
		if (currentTime - this.lastUpdateTime > 30000) {
			this.updateSky();
			this.lastUpdateTime = currentTime;
		}
	}

	public setSunElevation(elevation: number): void {
		if (!this.sky) return;

		const uniforms = this.sky.material.uniforms;
		const phi = THREE.MathUtils.degToRad(90 - elevation);
		const theta = THREE.MathUtils.degToRad(180);

		const sun = new THREE.Vector3();
		sun.setFromSphericalCoords(1, phi, theta);
		uniforms['sunPosition'].value.copy(sun);
	}

	public setSkyParameters(params: {
		turbidity?: number;
		rayleigh?: number;
		mieCoefficient?: number;
		mieDirectionalG?: number;
	}): void {
		if (!this.sky) return;

		const uniforms = this.sky.material.uniforms;
		if (params.turbidity !== undefined)
			uniforms['turbidity'].value = params.turbidity;
		if (params.rayleigh !== undefined)
			uniforms['rayleigh'].value = params.rayleigh;
		if (params.mieCoefficient !== undefined)
			uniforms['mieCoefficient'].value = params.mieCoefficient;
		if (params.mieDirectionalG !== undefined)
			uniforms['mieDirectionalG'].value = params.mieDirectionalG;
	}
}
