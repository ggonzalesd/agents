import axios from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/v1`;

export const httpService = axios.create({
	baseURL: BASE_URL,
	timeout: 5000,
	withCredentials: true,
});

let isRefreshing = false;
let failedQueue: {
	resolve: (value: unknown) => void;
	reject: (reason: unknown) => void;
}[] = [];

const processQueue = (error: unknown | null, token: string | null = null) => {
	for (const prom of failedQueue) {
		if (error) {
			prom.reject(error);
		} else {
			prom.resolve(token);
		}
	}
	failedQueue = [];
};

httpService.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		if (
			error.response?.status === 401 &&
			!originalRequest._retry &&
			!originalRequest.url?.includes('/auth/refresh') &&
			!originalRequest.url?.includes('/auth/login')
		) {
			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				}).then((token) => {
					if (token && typeof token === 'string') {
						localStorage.setItem('token', token);
					}
					return httpService(originalRequest);
				});
			}

			originalRequest._retry = true;
			isRefreshing = true;

			try {
				const response = await axios.post(
					`${BASE_URL}/auth/refresh`,
					{},
					{ withCredentials: true },
				);

				const newToken = response.data?.data?.token as string | undefined;
				if (newToken) {
					localStorage.setItem('token', newToken);
				}

				processQueue(null, newToken ?? null);
				return httpService(originalRequest);
			} catch (refreshError) {
				processQueue(refreshError, null);
				localStorage.removeItem('token');
				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		}

		return Promise.reject(error);
	},
);
