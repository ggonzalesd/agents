import * as esbuild from 'esbuild';

const entry = process.env.ENTRY || './server/index.ts';
const minify = (process.env.MINIFY || 'true') === 'true';

console.log(`Building ${entry}...`);
console.log(`Minify: ${minify}`);
console.log(`Output directory: build`);

esbuild
	.build({
		entryPoints: [entry, './server/workers/*.worker.ts'],
		outdir: 'build',

		bundle: true,
		sourcemap: true,
		minify,

		format: 'esm',
		target: 'esnext',
		platform: 'node',

		packages: 'external',
		keepNames: true,

		tsconfig: 'tsconfig.node.json',

		logLevel: 'info',
	})
	.then(() => {
		console.log('Build completed successfully.');
	})
	.catch(() => process.exit(1));
