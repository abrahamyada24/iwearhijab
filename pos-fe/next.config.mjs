/** @type {import('next').NextConfig} */
const rawBackendUrl = process.env.API_PROXY_TARGET || 'http://127.0.0.1:5200';
const backendUrl = rawBackendUrl.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
const backendOrigin = (() => {
  try {
    return new URL(backendUrl).origin;
  } catch {
    return '';
  }
})();
// Cloudflare Pages injects CF_PAGES=1 automatically during Git builds.
// Keep STATIC_EXPORT for explicit local/CI builds while making Pages builds
// independent from dashboard build-variable propagation.
const staticExport = process.env.STATIC_EXPORT === 'true' || process.env.CF_PAGES === '1';
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://res.cloudinary.com${backendOrigin ? ` ${backendOrigin}` : ''}`,
  "font-src 'self' data:",
  `connect-src 'self'${backendOrigin ? ` ${backendOrigin}` : ''}`,
].join('; ');

const backendImagePattern = (() => {
  try {
    const url = new URL(backendUrl);
    return {
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      port: url.port,
      pathname: '/uploads/**',
    };
  } catch {
    return null;
  }
})();

const nextConfig = {
  ...(staticExport ? {} : { async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  } }),
  ...(staticExport ? {} : { async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`
      }
    ]
  } }),
  ...(staticExport ? { output: 'export', trailingSlash: true } : {}),
  images: {
    unoptimized: staticExport,
    remotePatterns: [
      ...(backendImagePattern ? [backendImagePattern] : []),
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
  },
};

export default nextConfig;
