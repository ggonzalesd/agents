export class AStar {
	allowDiagonal: boolean;

	constructor({ allowDiagonal = true } = {}) {
		this.allowDiagonal = allowDiagonal;
	}

	findPath(
		grid: number[][],
		start: { x: number; y: number },
		end: { x: number; y: number },
	) {
		const open = new Set<string>();
		const closed = new Set();
		const cameFrom = new Map();

		const key = (x: number, y: number) => `${x},${y}`;
		const h = (a: { x: number; y: number }, b: { x: number; y: number }) =>
			Math.hypot(a.x - b.x, a.y - b.y);

		const gScore = new Map();
		const fScore = new Map();

		const startKey = key(start.x, start.y);
		gScore.set(startKey, 0);
		fScore.set(startKey, h(start, end));

		open.add(startKey);

		let closestNode = { x: start.x, y: start.y };
		let closestDist = h(start, end);

		while (open.size > 0) {
			let currentKey = [...open].reduce((a, b) =>
				(fScore.get(a) ?? Infinity) < (fScore.get(b) ?? Infinity) ? a : b,
			);

			const [cx, cy] = currentKey.split(',').map(Number);
			const current = { x: cx, y: cy };

			if (cx === end.x && cy === end.y && grid[cy]?.[cx] === 0) {
				return this.#reconstructPath(cameFrom, currentKey);
			}

			open.delete(currentKey);
			closed.add(currentKey);

			const neighbors = this.#getNeighbors(grid, current);
			for (const n of neighbors) {
				const nk = key(n.x, n.y);
				if (closed.has(nk)) continue;

				const tentativeG = (gScore.get(currentKey) ?? Infinity) + h(current, n);
				if (!open.has(nk) || tentativeG < (gScore.get(nk) ?? Infinity)) {
					cameFrom.set(nk, currentKey);
					gScore.set(nk, tentativeG);
					fScore.set(nk, tentativeG + h(n, end));
					open.add(nk);
				}

				const distToEnd = h(n, end);
				if (distToEnd < closestDist) {
					closestDist = distToEnd;
					closestNode = { ...n };
				}
			}
		}

		const fallbackKey = key(closestNode.x, closestNode.y);
		return this.#reconstructPath(cameFrom, fallbackKey);
	}

	#getNeighbors(grid: number[][], node: { x: number; y: number }) {
		const dirs = [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
		];

		if (this.allowDiagonal) {
			const diagonals = [
				[1, 1],
				[1, -1],
				[-1, 1],
				[-1, -1],
			];
			for (const [dx, dy] of diagonals) {
				const x = node.x + dx;
				const y = node.y + dy;

				if (grid[y]?.[x] !== 0) continue;

				const adj1 = grid[node.y]?.[x];
				const adj2 = grid[y]?.[node.x];
				if (adj1 === 0 && adj2 === 0) {
					dirs.push([dx, dy]);
				}
			}
		}

		const result = [];
		for (const [dx, dy] of dirs) {
			const x = node.x + dx;
			const y = node.y + dy;
			if (grid[y]?.[x] === 0) result.push({ x, y });
		}
		return result;
	}

	#reconstructPath(cameFrom: Map<string, string>, currentKey: string) {
		const path: [number, number][] = [];
		let cKey: string | undefined = currentKey;

		while (cKey) {
			const [x, y] = cKey.split(',').map(Number);
			path.unshift([x, y]);
			cKey = cameFrom.get(cKey);
		}

		return path;
	}
}
