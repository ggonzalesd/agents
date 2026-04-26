import { ComponentEcs } from '#/ecs/Component.ecs';
import type { NPCState } from '#/state/game.state';
import { posGridToReal } from '#/utils/map.utils';
import * as THREE from 'three';
import { defaultMap } from '#/maps/default.map';
import { RenderClientEcs } from '../renderClient.ecs';
import { UIClientEcs } from '../uiClient.ecs';

export class NpcPathRenderEcs extends ComponentEcs {
	private renderClient: RenderClientEcs = null!;
	private showNpcPaths = true;
	private lastRevision = -1;
	private lastActive = false;
	private lastVisible = true;
	private mesh: THREE.Mesh | null = null;
	private material = new THREE.MeshStandardMaterial({
		color: 0x66d9ff,
		emissive: new THREE.Color(0x66d9ff),
		emissiveIntensity: 1.8,
		transparent: true,
		opacity: 0.9,
	});

	constructor(private readonly state: NPCState) {
		super();
	}

	onStart(): void {
		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('RenderClientEcs not found');

		this.world.get(UIClientEcs).ifSome((uiClient) => {
			this.callOnDelete(
				uiClient.game.subscribe((gameState) => {
					this.showNpcPaths = gameState.showNpcPaths;
				}),
			);
		});

		this.callOnDelete(() => {
			this.destroyMesh();
			this.material.dispose();
		});
	}

	onLoop(): void {
		const isVisible = this.showNpcPaths && this.state.debugPath.active;
		const needsRefresh =
			this.lastRevision !== this.state.debugPath.revision ||
			this.lastActive !== this.state.debugPath.active ||
			this.lastVisible !== isVisible;

		if (!needsRefresh) {
			return;
		}

		this.lastRevision = this.state.debugPath.revision;
		this.lastActive = this.state.debugPath.active;
		this.lastVisible = isVisible;

		if (!isVisible) {
			this.destroyMesh();
			return;
		}

		const worldPoints = Array.from(this.state.debugPath.points)
			.map((point) => posGridToReal({ x: point.x, y: point.y }, defaultMap))
			.map((point) => new THREE.Vector3(point.x, 0.1, point.z));

		if (worldPoints.length < 2) {
			this.destroyMesh();
			return;
		}

		const curve = new THREE.CurvePath<THREE.Vector3>();
		for (let index = 0; index < worldPoints.length - 1; index += 1) {
			curve.add(new THREE.LineCurve3(worldPoints[index], worldPoints[index + 1]));
		}

		const geometry = new THREE.TubeGeometry(
			curve,
			Math.max(worldPoints.length * 4, 8),
			0.055,
			6,
			false,
		);

		this.destroyMesh();
		this.mesh = new THREE.Mesh(geometry, this.material);
		this.mesh.castShadow = false;
		this.mesh.receiveShadow = false;
		this.renderClient.scene.add(this.mesh);
	}

	private destroyMesh(): void {
		if (this.mesh == null) {
			return;
		}

		this.renderClient.scene.remove(this.mesh);
		this.mesh.geometry.dispose();
		this.mesh = null;
	}
}
