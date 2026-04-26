import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Critical CSS inline */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS for above-the-fold content */
            body{margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;background:#f8fafc}
            .loading-spinner{width:40px;height:40px;border:3px solid #e2e8f0;border-top:3px solid #3b82f6;border-radius:50%;animation:spin 1s linear infinite;margin:20vh auto}
            @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
            .critical-container{min-height:100vh;display:flex;align-items:center;justify-content:center}
            .critical-header{font-size:2rem;font-weight:700;color:#1e293b;margin-bottom:1rem}
            .critical-text{color:#64748b;font-size:1.1rem}
          `
        }} />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://cdn.chamaconnect.io" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="//api.chamaconnect.io" />
        <link rel="dns-prefetch" href="//analytics.chamaconnect.io" />
        
        {/* Critical fonts */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        
        {/* Manifest and icons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        
        {/* Meta tags for performance */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#3b82f6" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        
        {/* Preload critical JavaScript */}
        <link rel="preload" href="/_next/static/chunks/main.js" as="script" />
        <link rel="preload" href="/_next/static/chunks/webpack.js" as="script" />
        <link rel="preload" href="/_next/static/chunks/framework.js" as="script" />
        
        {/* Service Worker Registration */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then((registration) => {
                    console.log('SW registered: ', registration);
                  })
                  .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }
          `
        }} />
      </Head>
      <body>
        <div id="root">
          <Main />
        </div>
        <NextScript />
        
        {/* Critical loading fallback */}
        <noscript>
          <div className="critical-container">
            <div>
              <h1 className="critical-header">ChamaConnect</h1>
              <p className="critical-text">JavaScript is required for the best experience</p>
            </div>
          </div>
        </noscript>
      </body>
    </Html>
  );
}
