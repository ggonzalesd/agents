import Piscina from 'piscina';

import { ComponentEcs } from '#/ecs';

import envConfig from '$/config/env.config';

import {
	getExecutionArgs,
	getWorkerFile,
	WorkerType,
} from '$/utils/workers.utils';
import { defaultMap, PATHFINDING_SOLID } from '#/maps/default.map';
import type { IPathfinder } from '#/pathfinding/pathfinder.interface';

type WorkerInput = {
	grid: number[][];
	start: [number, number];
	end: [number, number];
};

type WorkerOutput = {
	result: [number, number][];
};

export class WorldPathfinderEcs extends ComponentEcs implements IPathfinder {
	private worker: Piscina<WorkerInput, WorkerOutput>;
	public map = defaultMap;

	private pathGrid: number[][];

	constructor() {
		super();

		this.worker = new Piscina({
			filename: getWorkerFile(WorkerType.A_STAR),
			execArgv: getExecutionArgs(),
			maxThreads: envConfig.WORKER_THREADS,
		});

		this.pathGrid = defaultMap.grid.map((row) =>
			row.map((cell) => (PATHFINDING_SOLID.has(cell) ? 1 : 0)),
		);
	}

	public async getPathFromAtoB(start: [number, number], end: [number, number]) {
		const grid = this.pathGrid;

		// Validate inputs
		if (grid.length < start[1] || grid[0].length < start[0]) {
			return {
				result: [],
			};
		}

		if (grid.length < end[1] || grid[0].length < end[0]) {
			return {
				result: [],
			};
		}

		// Run the worker
		const output = await this.worker.run({
			grid,
			start,
			end,
		});

		return output;
	}
}
