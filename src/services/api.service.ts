import axios from 'axios';

export const loginService = async (username: string, password: string) => {
	const response = await axios.post(
		`${import.meta.env.VITE_API_URL}/api/v1/auth/login`,
		{
			username,
			password,
		},
		{
			withCredentials: true,
		},
	);

	return response.data as {
		token: string;
		payload: {
			id: string;
			username: string;
			hash: string;
			role?: 'ADMIN' | 'USER' | 'MODERATOR';
		};
	};
};

export const profileService = async () => {
	const response = await axios.get(
		`${import.meta.env.VITE_API_URL}/api/v1/auth/profile`,
		{
			withCredentials: true,
		},
	);

	return response.data as {
		id: string;
		username: string;
		hash: string;
		role?: 'ADMIN' | 'USER' | 'MODERATOR';
	};
};
