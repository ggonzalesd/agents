export const validObject = (value: unknown): object | undefined => {
	if (typeof value === 'object' && value != null) return value;
	return undefined;
};
