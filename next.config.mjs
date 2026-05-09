/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
    },
    experimental: {
        optimizeCss: false,
    },
    logging: {
        fetches: {
            fullUrl: false,
        },
    },
    // Dev: avoid watching huge non-app folders (reduces RAM, CPU, and NVMe churn)
    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                ...config.watchOptions,
                ignored: [
                    '**/node_modules/**',
                    '**/.git/**',
                    '**/.next/**',
                    '**/farwry data/**',
                ],
            };
        }
        return config;
    },
    // Keep fewer compiled pages in memory between navigations
    onDemandEntries: {
        maxInactiveAge: 60 * 1000,
        pagesBufferLength: 5,
    },
};

export default nextConfig;
