import type { OkResponse } from '#/utils/http-client.util';
import { httpService } from './http.service';

export const saveNPCSkin = async (
	file: File,
): Promise<{
	url: string;
	filename: string;
}> => {
	const formData = new FormData();
	formData.append('file', file);

	const response = await httpService.post<
		OkResponse<{
			url: string;
			filename: string;
		}>
	>('/skin/save', formData, {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	});

	return response.data.data;
};
