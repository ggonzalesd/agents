import Piscina from 'piscina';

import type { MapSchema } from '#/maps/maps';
import type { IVec3 } from '#/utils/math.util';
import { PATHFINDING_SOLID } from '#/maps/default.map';

import envConfig from '$/config/env.config';
import { getExecutionArgs, getWorkerFile, WorkerType } from '$/utils/workers.utils';

import type { IPathfinder } from '#/pathfinding/pathfinder.interface';

type WorkerInput = {
    grid: number[][];
    start: [number, number];
    end: [number, number];
};

type WorkerOutput = {
    result: [number, number][];
};

/**
 * Pathfinder autónomo con su propio pool de workers A*.
 * Agnóstico al dominio: puede usarse en experimentos, zonas de mundo, etc.
 *
 * El mapa base define el layout local (offsetX/offsetY centran el grid).
 * `worldOffset` desplaza ese layout a una posición arbitraria del mundo 3D,
 * de forma que las coordenadas de grid se convierten correctamente a
 * coordenadas reales vía `posGridToReal`.
 */
export class DynamicPathfinder implements IPathfinder {
    private readonly worker: Piscina<WorkerInput, WorkerOutput>;
    private readonly pathGrid: number[][];
    readonly map: MapSchema;

    constructor(
        baseMap: MapSchema,
        worldOffset: IVec3,
    ) {
        this.map = {
            ...baseMap,
            offsetX: baseMap.offsetX + worldOffset.x,
            offsetY: baseMap.offsetY + worldOffset.z,
        };

        this.pathGrid = baseMap.grid.map((row) =>
            row.map((cell) => (PATHFINDING_SOLID.has(cell) ? 1 : 0)),
        );

        this.worker = new Piscina({
            filename: getWorkerFile(WorkerType.A_STAR),
            execArgv: getExecutionArgs(),
            maxThreads: envConfig.WORKER_THREADS,
        });
    }

    async getPathFromAtoB(
        start: [number, number],
        end: [number, number],
    ): Promise<{ result: [number, number][] }> {
        const grid = this.pathGrid;

        if (start[0] < 0 || start[1] < 0 || start[0] >= grid[0].length || start[1] >= grid.length) {
            return { result: [] };
        }

        if (end[0] < 0 || end[1] < 0 || end[0] >= grid[0].length || end[1] >= grid.length) {
            return { result: [] };
        }

        return this.worker.run({ grid, start, end });
    }

    isWalkable(x: number, y: number): boolean {
        if (y < 0 || y >= this.pathGrid.length) return false;
        if (x < 0 || x >= this.pathGrid[0].length) return false;
        return this.pathGrid[y][x] === 0;
    }

    dispose(): void {
        void this.worker.destroy();
    }
}
