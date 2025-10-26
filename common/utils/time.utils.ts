export function timeAgo(date: Date) {
	const diff = Date.now() - new Date(date).getTime();
	if (diff <= 0) return '0s ago';

	const s = Math.floor(diff / 1000);
	const m = Math.floor(s / 60);
	const h = Math.floor(m / 60);
	const d = Math.floor(h / 24);
	const y = Math.floor(d / 365);

	if (y > 0) return `${y}y ago`;
	if (d > 0) return `${d}d ago`;
	if (h > 0) return `${h}h ago`;
	if (m > 0) return `${m}m ago`;
	return `${s}s ago`;
}
