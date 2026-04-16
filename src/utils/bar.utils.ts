import * as THREE from 'three';

const BAR_WIDTH = 150;
const BAR_HEIGHT = 14;
const TEXT_FONT = '700 14px Arial';
const PADDING = 6;
const BAR_RADIUS = 4;

function getBarColor(ratio: number): string {
	if (ratio > 0.6) return '#22c55e';
	if (ratio > 0.3) return '#eab308';
	return '#ef4444';
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.arcTo(x + w, y, x + w, y + r, r);
	ctx.lineTo(x + w, y + h - r);
	ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
	ctx.lineTo(x + r, y + h);
	ctx.arcTo(x, y + h, x, y + h - r, r);
	ctx.lineTo(x, y + r);
	ctx.arcTo(x, y, x + r, y, r);
	ctx.closePath();
}

export const createBarTexture = (current: number, max: number) => {
	const ratio = max > 0 ? Math.max(0, Math.min(current / max, 1)) : 0;
	const label = `${Math.round(current)}/${Math.round(max)}`;

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;

	ctx.font = TEXT_FONT;
	const textMetrics = ctx.measureText(label);
	const textWidth = Math.ceil(textMetrics.width);
	const gap = 8;

	const width = PADDING + BAR_WIDTH + gap + textWidth + PADDING;
	const height = PADDING + BAR_HEIGHT + PADDING;

	canvas.width = width;
	canvas.height = height;

	// Background
	ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
	roundRect(ctx, 0, 0, width, height, 6);
	ctx.fill();

	// Bar background (empty)
	const barX = PADDING;
	const barY = PADDING;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
	roundRect(ctx, barX, barY, BAR_WIDTH, BAR_HEIGHT, BAR_RADIUS);
	ctx.fill();

	// Bar fill
	const fillWidth = BAR_WIDTH * ratio;
	if (fillWidth > 0) {
		ctx.fillStyle = getBarColor(ratio);
		roundRect(
			ctx,
			barX,
			barY,
			Math.max(fillWidth, BAR_RADIUS * 2),
			BAR_HEIGHT,
			BAR_RADIUS,
		);
		ctx.fill();
	}

	// Text label
	ctx.font = TEXT_FONT;
	ctx.fillStyle = 'white';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'middle';
	ctx.fillText(label, PADDING + BAR_WIDTH + gap, height / 2);

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;

	return { texture, size: { width, height } };
};
