/** @type {import('next').NextConfig} */
const nextConfig = {
    images:{
        unoptimized: true
    },
    // Reduce memory usage in development
    experimental: {
        // Disable some memory-intensive features
        optimizeCss: false,
    },
    // Reduce logging verbosity
    logging: {
        fetches: {
            fullUrl: false,
        },
    },
};

export default nextConfig;
