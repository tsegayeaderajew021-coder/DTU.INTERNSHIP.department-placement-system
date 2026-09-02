const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    [
      '/login.php',
      '/users_api.php',
      '/profile_update.php',
      '/departments_api.php',
      '/departments_update.php',
      '/student_profile.php',
      '/student_preferences.php',
      '/import_api.php',
      '/placement_engine.php',
      '/audit_logs_api.php',
    ],
    createProxyMiddleware({
      target: 'http://localhost/placment_backend',
      changeOrigin: true,
      secure: false,
    })
  );
};