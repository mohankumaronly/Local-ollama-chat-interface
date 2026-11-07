import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_TOKEN: z.string().min(16, 'API_TOKEN must be at least 16 chars'),
  // Comma-separated hostname patterns the backend is allowed to call.
  // Wildcards: *.trycloudflare.com matches any subdomain.
  OLLAMA_ALLOWED_HOSTS: z
    .string()
    .default('*.trycloudflare.com,localhost,127.0.0.1,host.docker.internal')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
