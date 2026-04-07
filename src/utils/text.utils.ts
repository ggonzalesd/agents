import * as THREE from 'three';

export const createTextTexture = (
	text: string,
	options?: { color?: string; background?: string },
) => {
	const font = '600 20px Arial';
	const color = options?.color ?? 'white';
	const background: string = options?.background ?? 'black';
	const padding = 10;

	const maxWidth = 400; // máximo ancho antes de hacer salto de línea
	const lineHeight = 24; // altura entre líneas

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	ctx.font = font;

	// dividir el texto en palabras
	const words = text.split(' ');
	const lines: string[] = [];
	let currentLine = '';

	for (const word of words) {
		const testLine = currentLine ? `${currentLine} ${word}` : word;
		const { width } = ctx.measureText(testLine);
		if (width > maxWidth && currentLine) {
			lines.push(currentLine);
			currentLine = word;
		} else {
			currentLine = testLine;
		}
	}
	if (currentLine) lines.push(currentLine);

	const width = Math.ceil(maxWidth + padding * 2);
	const height = Math.ceil(lines.length * lineHeight + padding * 2);

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

	// dibujar líneas centradas
	lines.forEach((line, i) => {
		const y = padding + lineHeight * i + lineHeight / 2;
		ctx.fillText(line, width / 2, y);
	});

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;

	return { texture, size: { width, height } };
};
