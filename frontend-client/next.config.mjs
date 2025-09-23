
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const nextConfig = {
	outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
};

export default nextConfig;
