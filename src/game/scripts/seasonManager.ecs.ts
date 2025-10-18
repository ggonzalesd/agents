import * as THREE from 'three';
import { ComponentEcs } from '#/ecs/Component.ecs';
import { Season, SeasonZoneEcs } from './seasonZone.ecs';
import { RenderClientEcs } from './renderClient.ecs';

export class SeasonManagerEcs extends ComponentEcs {
	private zones: SeasonZoneEcs[] = [];
	private readonly ZONE_SIZE = 100;
	private readonly TOTAL_SIZE = 200;

	constructor() {
		super();
	}

	onStart(): void {
		this.createSeasonZones();
	}

	private createSeasonZones(): void {
		const renderClient = this.world.get(RenderClientEcs);

		renderClient.ifSome((render) => {
			const offset = this.ZONE_SIZE / 2;

			const zoneConfigs = [
				{
					season: Season.SPRING,
					position: new THREE.Vector3(-offset, 0, -offset),
				},
				{
					season: Season.SUMMER,
					position: new THREE.Vector3(offset, 0, -offset),
				},
				{
					season: Season.AUTUMN,
					position: new THREE.Vector3(-offset, 0, offset),
				},
				{
					season: Season.WINTER,
					position: new THREE.Vector3(offset, 0, offset),
				},
			];

			for (const config of zoneConfigs) {
				const zone = new SeasonZoneEcs({
					season: config.season,
					position: config.position,
					size: this.ZONE_SIZE,
					scene: render.scene,
				});

				this.zones.push(zone);
			}

			this.createDivisionLines();
		});
	}

	private createDivisionLines(): void {
		const renderClient = this.world.get(RenderClientEcs);

		renderClient.ifSome((render) => {
			const lineMaterial = new THREE.LineBasicMaterial({
				color: 0x000000,
				linewidth: 2,
			});

			const verticalGeometry = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0.01, -this.TOTAL_SIZE / 2),
				new THREE.Vector3(0, 0.01, this.TOTAL_SIZE / 2),
			]);
			const verticalLine = new THREE.Line(verticalGeometry, lineMaterial);
			render.scene.add(verticalLine);

			const horizontalGeometry = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(-this.TOTAL_SIZE / 2, 0.01, 0),
				new THREE.Vector3(this.TOTAL_SIZE / 2, 0.01, 0),
			]);
			const horizontalLine = new THREE.Line(horizontalGeometry, lineMaterial);
			render.scene.add(horizontalLine);

			this.callOnDelete(() => {
				render.scene.remove(verticalLine);
				render.scene.remove(horizontalLine);
				verticalGeometry.dispose();
				horizontalGeometry.dispose();
				lineMaterial.dispose();
			});
		});
	}

	public getSeasonAtPosition(position: THREE.Vector3): Season {
		if (position.x < 0 && position.z < 0) return Season.SPRING;
		if (position.x >= 0 && position.z < 0) return Season.SUMMER;
		if (position.x < 0 && position.z >= 0) return Season.AUTUMN;
		return Season.WINTER;
	}

	onDelete(): void {
		this.zones.forEach((zone) => zone.dispose());
		this.zones = [];
	}
}
