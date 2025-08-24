export const jsonResponse = {
	ok: (data: unknown, props: { status?: number; message?: string } = {}) => ({
		ok: true,
		status: props.status ?? 200,
		message: props.message ?? 'Success',
		data,
	}),
	error: (
		message: string,
		props: { status?: number; data?: unknown } = {},
	) => ({
		ok: false,
		status: props.status ?? 500,
		message,
		data: props.data ?? null,
	}),
};
