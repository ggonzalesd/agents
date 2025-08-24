export class HttpError extends Error {
	public status: number;
	public data: unknown = null;

	constructor(status: number, message: string, data?: unknown) {
		super(message);
		this.status = status;
		this.data = data ?? null;
	}

	static notFound(message: string, data?: unknown) {
		return new HttpError(404, message, data);
	}

	static badRequest(message: string, data?: unknown) {
		return new HttpError(400, message, data);
	}

	static unauthorized(message: string, data?: unknown) {
		return new HttpError(401, message, data);
	}

	static forbidden(message: string, data?: unknown) {
		return new HttpError(403, message, data);
	}

	static server(message: string, data?: unknown) {
		return new HttpError(500, message, data);
	}
}
