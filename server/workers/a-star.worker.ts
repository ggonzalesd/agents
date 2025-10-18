import PF from 'pathfinding';

interface AStarWorkerInput {
	grid: number[][];
	start: [number, number];
	end: [number, number];
}

export default async ({ grid, start, end }: AStarWorkerInput) => {
	const pfGrid = new PF.Grid(grid);
	const finder = new PF.AStarFinder();

	const path = finder.findPath(start[0], start[1], end[0], end[1], pfGrid);

	return { result: path };
};
