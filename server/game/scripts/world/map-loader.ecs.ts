import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs, type EntityEcs } from '#/ecs';
import type { MapSchema } from '#/maps/maps';
import { PHYSICS_SOLID } from '#/maps/default.map';
import type { IPathfinder } from '#/pathfinding/pathfinder.interface';
import type { IVec3 } from '#/utils/math.util';

import { ServerDataEcs } from '../serverData.ecs';
import { treeServerFactory } from '../../prefab/tree.server';

const TREE_TILE = 5;

export type MapInstanceContext = {
	world: typeof import('#/ecs').WorldEcs.prototype;
	name: string;
	pos: IVec3;
	type: string;
	metadata: Record<string, unknown>;
	pathfinder?: IPathfinder;
};

export type MapInstanceFactory = (ctx: MapInstanceContext) => EntityEcs;

interface LoadedMapState {
	rigidBodyHandles: number[];
	entityNames: string[];
}

/**
 * Gestiona la carga y descarga dinámica de mapas en posiciones arbitrarias
 * del mundo 3D. Agnóstico al dominio: puede usarse en experimentos, zonas
 * de mundo, dungeons, etc.
 *
 * Registra un conjunto de factories de instancias (`registerInstanceFactory`)
 * que se usan para instanciar entidades declaradas en el campo `instances`
 * del JSON del mapa. Todo lo cargado queda registrado bajo un `id` para
 * poder desmontarlo limpiamente.
 */
export class MapLoaderEcs extends ComponentEcs {
	private readonly loadedMaps = new Map<string, LoadedMapState>();
	private readonly instanceFactories = new Map<string, MapInstanceFactory>();

	/**
	 * Registra una factory para un tipo de instancia declarado en el JSON del
	 * mapa. Las factories se buscan por `instance.type`.
	 */
	registerInstanceFactory(type: string, factory: MapInstanceFactory): void {
		this.instanceFactories.set(type, factory);
	}

	/**
	 * Carga un mapa en el mundo 3D en la posición indicada por `worldOffset`.
	 *
	 * - Crea colliders Rapier para tiles PHYSICS_SOLID.
	 * - Crea entidades ECS para tiles de árbol (tile 5).
	 * - Instancia los objetos declarados en `map.instances` usando las factories
	 *   registradas. Si `pathfinder` se pasa, se inyecta en cada instancia.
	 *
	 * @param id          Identificador único para poder desmontar después.
	 * @param map         Mapa parseado (MapSchema).
	 * @param worldOffset Posición base en el mundo donde montar el mapa.
	 * @param pathfinder  Pathfinder opcional para inyectar en las instancias.
	 */
	mountMap(id: string, map: MapSchema, worldOffset: IVec3, pathfinder?: IPathfinder): void {
		if (this.loadedMaps.has(id)) {
			console.warn(`[MapLoaderEcs] Map '${id}' is already mounted. Unmount it first.`);
			return;
		}

		const serverData = this.world.get(ServerDataEcs).unwrap('ServerDataEcs not found');
		const physics = serverData.worldPhysic;

		const state: LoadedMapState = {
			rigidBodyHandles: [],
			entityNames: [],
		};

		// Tiles del grid → colliders y entidades estáticas
		map.grid.forEach((row, z) => {
			row.forEach((cell, x) => {
				const worldX = x + map.offsetX + worldOffset.x + 0.5;
				const worldZ = z + map.offsetY + worldOffset.z + 0.5;

				if (PHYSICS_SOLID.has(cell)) {
					const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
						worldX,
						worldOffset.y,
						worldZ,
					);
					const body = physics.createRigidBody(bodyDesc);
					physics.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 1, 0.5), body);
					state.rigidBodyHandles.push(body.handle);
				}

				if (cell === TREE_TILE) {
					const name = `map-${id}-tree-${x}-${z}`;
					const tree = treeServerFactory({
						world: this.world,
						name,
						pos: { x: worldX, y: worldOffset.y, z: worldZ },
					});
					this.world.addEntity(tree);
					state.entityNames.push(name);
				}
			});
		});

		// Instancias únicas declaradas en el JSON del mapa
		map.instances.forEach((instance, index) => {
			const factory = this.instanceFactories.get(instance.type);
			if (!factory) {
				console.warn(`[MapLoaderEcs] No factory registered for instance type '${instance.type}' in map '${id}'.`);
				return;
			}

			const name = `map-${id}-instance-${instance.type}-${index}`;
			const pos: IVec3 = {
				x: instance.x + worldOffset.x,
				y: instance.y + worldOffset.y,
				z: instance.z + worldOffset.z,
			};

			const entity = factory({
				world: this.world,
				name,
				pos,
				type: instance.type,
				metadata: instance.metadata,
				pathfinder,
			});

			this.world.addEntity(entity);
			state.entityNames.push(name);

			serverData.room.broadcast('experiment:instance:create', {
				id: name,
				type: instance.type,
				x: pos.x,
				y: pos.y,
				z: pos.z,
				metadata: instance.metadata,
			});
		});

		this.loadedMaps.set(id, state);

		console.log(
			`[MapLoaderEcs] Mounted map '${id}' at offset (${worldOffset.x}, ${worldOffset.y}, ${worldOffset.z}):`,
			`${state.rigidBodyHandles.length} colliders,`,
			`${state.entityNames.length} entities`,
		);
	}

	/**
	 * Desmonta un mapa previamente cargado, eliminando todos sus colliders
	 * Rapier y entidades ECS.
	 */
	unmountMap(id: string): void {
		const state = this.loadedMaps.get(id);
		if (!state) {
			console.warn(`[MapLoaderEcs] No mounted map found with id '${id}'.`);
			return;
		}

		const serverData = this.world.get(ServerDataEcs).unwrap('ServerDataEcs not found');
		const physics = serverData.worldPhysic;

		for (const handle of state.rigidBodyHandles) {
			const body = physics.getRigidBody(handle);
			if (body) {
				physics.removeRigidBody(body);
			}
		}

		for (const name of state.entityNames) {
			this.world.deleteEntityById(name);
			serverData.room.broadcast('experiment:instance:remove', { id: name });
		}

		this.loadedMaps.delete(id);

		console.log(`[MapLoaderEcs] Unmounted map '${id}'.`);
	}
}
