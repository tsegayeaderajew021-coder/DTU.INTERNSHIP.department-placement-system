const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    ['/auth', '/api'],
    createProxyMiddleware({
      target: 'http://localhost/placment_backend',
      changeOrigin: true,
      secure: false,
    })
  );
};