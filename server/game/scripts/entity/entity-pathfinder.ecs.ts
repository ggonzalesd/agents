import { ComponentEcs } from '#/ecs';
import type { IPathfinder } from '#/pathfinding/pathfinder.interface';

/**
 * Componente opcional que asocia un pathfinder específico a una entidad.
 * Cuando está presente, los behaviors de movimiento lo usan en lugar del
 * WorldPathfinderEcs global, permitiendo que entidades instanciadas fuera
 * del mapa del lobby (p. ej. en slots de experimento) naveguen correctamente.
 */
export class EntityPathfinderEcs extends ComponentEcs {
	constructor(public readonly pathfinder: IPathfinder) {
		super();
	}
}
