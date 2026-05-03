import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import type { TriggerZoneState } from '#/state/trigger-zone.state';

import { RenderClientEcs } from '../renderClient.ecs';

export class TriggerZone3DEcs extends ComponentEcs {
	private mesh: THREE.Mesh = null!;
	private renderClient: RenderClientEcs = null!;

	constructor(private state: TriggerZoneState) {
		super();
	}

	onStart(): void {
		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('RenderClientEcs not found');

		const geometry = new THREE.CylinderGeometry(
			this.state.radius,
			this.state.radius,
			this.state.height,
			32,
			1,
			true,
		);

		const color = new THREE.Color(this.state.color);

		const material = new THREE.ShaderMaterial({
			uniforms: {
				uColor: { value: color },
				uTopAlpha: { value: 0.6 },
				uBottomAlpha: { value: 0.0 },
			},
			vertexShader: /* glsl */ `
				varying vec3 vWorldPosition;
				varying vec2 vUv;
				void main() {
					vec4 worldPos = modelMatrix * vec4(position, 1.0);
					vWorldPosition = worldPos.xyz;
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: /* glsl */ `
				uniform vec3 uColor;
				uniform float uTopAlpha;
				uniform float uBottomAlpha;
				varying vec2 vUv;
				void main() {
					float alpha = mix(uBottomAlpha, uTopAlpha, vUv.y);
					gl_FragColor = vec4(uColor, alpha);
				}
			`,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide,
		});

		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.set(
			this.state.position.x,
			this.state.position.y,
			this.state.position.z,
		);

		this.renderClient.scene.add(this.mesh);
		this.callOnDelete(() => {
			this.renderClient.scene.remove(this.mesh);
			geometry.dispose();
			material.dispose();
		});
	}
}
