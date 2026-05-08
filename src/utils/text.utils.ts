import * as THREE from 'three';

export const createTextTexture = (
	text: string,
	options?: { color?: string; background?: string; fontSize?: number },
) => {
	const fontSize = options?.fontSize ?? 20;
	const font = `600 ${fontSize}px Arial`;
	const color = options?.color ?? 'white';
	const background: string = options?.background ?? 'black';
	const padding = 10;

	const maxWidth = 400; // máximo ancho antes de hacer salto de línea
	const lineHeight = Math.ceil(fontSize * 1.2); // altura entre líneas proporcional al tamaño

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	ctx.font = font;

	// Dividir por saltos de línea explícitos y luego hacer word-wrap por segmento
	const paragraphs = text.split('\n');
	const lines: string[] = [];

	for (const paragraph of paragraphs) {
		const words = paragraph.split(' ');
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
		lines.push(currentLine);
	}

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
