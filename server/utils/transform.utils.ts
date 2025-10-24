export const safeJSONParse = (data: unknown): any => {
	if (typeof data !== 'string') {
		return null;
	}

	try {
		return JSON.parse(data);
	} catch {
		return null;
	}
};
