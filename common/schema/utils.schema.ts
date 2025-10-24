import { z } from 'zod';

export const metadataSchema = z.object({}).catchall(z.any());
