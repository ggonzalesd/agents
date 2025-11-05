import { AStar } from './../../common/pathfinding/a-star';

interface AStarWorkerInput {
	grid: number[][];
	start: [number, number];
	end: [number, number];
}

const astar = new AStar({ allowDiagonal: true });

export default async ({ grid, start, end }: AStarWorkerInput) => {
	const path = astar.findPath(
		grid,
		{ x: start[0], y: start[1] },
		{ x: end[0], y: end[1] },
	);

	/*
	for (const p of path) {
		grid[p[1]][p[0]] = 2;
	}
	for (const row of grid) {
		let rowStr = '';
		for (const cell of row) {
			if (cell === 0) {
				rowStr += ' ';
			} else if (cell === 1) {
				rowStr += '█';
			} else {
				rowStr += '·';
			}
		}
		console.log(rowStr);
	}
 */
	return { result: path };
};
