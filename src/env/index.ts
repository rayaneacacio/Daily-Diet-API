import { config } from 'dotenv';
import { z } from 'zod';

if (process.env.NODE_ENV === 'test') {
  config({ path: '.env.test' })
} else {
  config();
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_CLIENT: z.enum(['sqlite', 'pg']),
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(3333)
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('Invalid environment variables!', env.error.format());

  throw new Error('Invalid environment variables');
};

export default env.data;