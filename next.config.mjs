/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next 14 bundles App Router handlers by default; keep the runtime packages external
    // so Chromium can access its packaged .br assets on Vercel.
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'puppeteer'],
    outputFileTracingIncludes: {
      '/api/export': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    },
  },
  webpack: (config) => {
    // Ignora il modulo 'canvas' richiesto da pdfjs-dist
    config.resolve.alias.canvas = false;
    
    // Ignora eventuali avvisi di codifica legacy sempre da pdf.js
    config.resolve.alias.encoding = false;
    
    return config;
  },
};

export default nextConfig;