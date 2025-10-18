import path from 'node:path';
import envConfig from '$/config/env.config';

export function getWorkerFile(name: string) {
	const rootDir = envConfig.NODE_ENV === 'development' ? 'server' : 'build';
	const ext =
		envConfig.NODE_ENV === 'development' ? '.worker.ts' : '.worker.js';

	const workerPath = path.resolve(
		process.cwd(),
		rootDir,
		'workers',
		name + ext,
	);

	return workerPath;
}

export function getExecutionArgs() {
	return envConfig.NODE_ENV === 'development' ? ['--import', 'tsx'] : undefined;
}
