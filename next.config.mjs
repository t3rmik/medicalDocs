/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Ignora il modulo 'canvas' richiesto da pdfjs-dist
    config.resolve.alias.canvas = false;
    
    // Ignora eventuali avvisi di codifica legacy sempre da pdf.js
    config.resolve.alias.encoding = false;
    
    return config;
  },
};

export default nextConfig;