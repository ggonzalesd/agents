import * as THREE from 'three';

export const createTextTexture = (text: string) => {
	const font = '20px Arial';
	const color = '#ffffff';
	const background = 'transparent';
	const padding = 10;

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;

	ctx.font = font;
	const textMetrics = ctx.measureText(text);
	const width = Math.ceil(textMetrics.width + padding * 2);
	const height = Math.ceil(parseInt(font, 10) + padding * 2);

	canvas.width = width;
	canvas.height = height;

	ctx.font = font;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	if (background !== 'transparent') {
		ctx.fillStyle = background;
		ctx.fillRect(0, 0, width, height);
	}

	ctx.fillStyle = color;
	ctx.fillText(text, width / 2, height / 2);

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;

	return { texture, size: { width, height } };
};
