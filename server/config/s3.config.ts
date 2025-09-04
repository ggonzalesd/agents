import { S3Client } from '@aws-sdk/client-s3';
import envConfig from './env.config';

export const s3ClientConfig = new S3Client({
	region: envConfig.S3_REGION,
	endpoint: envConfig.S3_URL,
	forcePathStyle: true,
	credentials: {
		accessKeyId: envConfig.S3_ACCESS_KEY,
		secretAccessKey: envConfig.S3_SECRET_KEY,
	},
});
