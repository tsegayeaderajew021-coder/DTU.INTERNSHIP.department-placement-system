<?php
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include __DIR__ . '/../config/db_config.php';
require_once __DIR__ . '/../config/logger.php';
$db = getDbConnection();
$auditPdo = null;
try {
    $auditPdo = getAuditPdo();
} catch (Throwable $error) {
    error_log('Audit database connection failed: ' . $error->getMessage());
}

$data = json_decode(file_get_contents('php://input'));
$identifier = trim((string) ($data->identifier ?? ''));
$credential = (string) ($data->password ?? '');

if ($identifier === '' || $credential === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Username or email and password are required.']);
    $db->close();
    exit;
}

if (ctype_digit($identifier)) {
    $userId = (int) $identifier;
    $loginSql = $db->prepare('SELECT id, username, email, password, role FROM users WHERE id = ? LIMIT 1');
    $loginSql->bind_param('i', $userId);
} elseif (strpos($identifier, '@') !== false) {
    $loginSql = $db->prepare('SELECT id, username, email, password, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
    $loginSql->bind_param('s', $identifier);
} else {
    $loginSql = $db->prepare('SELECT id, username, email, password, role FROM users WHERE username = ? LIMIT 1');
    $loginSql->bind_param('s', $identifier);
}

$loginSql->execute();
$result = $loginSql->get_result();
$user = $result ? $result->fetch_assoc() : null;
$isStudent = $user && strtolower((string) $user['role']) === 'student';
$isPasswordValid = $user && password_verify($credential, (string) $user['password']);

// Freshmen without email/password may use username + their own user ID.
$isStudentIdCredentialValid = $isStudent && ctype_digit($credential) && (int) $credential === (int) $user['id'];

if (!$user) {
    if ($auditPdo) {
        logActivity($auditPdo, null, null, 'auth.failure', 'Invalid credentials for identifier: ' . substr($identifier, 0, 100));
    }
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'code' => 'INVALID_IDENTIFIER',
        'message' => 'Email or username not found.'
    ]);
    $loginSql->close();
    $db->close();
    exit;
}

if (!$isPasswordValid && !$isStudentIdCredentialValid) {
    if ($auditPdo) {
        logActivity($auditPdo, null, null, 'auth.failure', 'Invalid password for identifier: ' . substr($identifier, 0, 100));
    }
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'code' => 'INVALID_PASSWORD',
        'message' => 'Password is incorrect.'
    ]);
    $loginSql->close();
    $db->close();
    exit;
}

session_start();
session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['role'] = $user['role'];
if ($auditPdo) {
    logActivity($auditPdo, (int) $user['id'], $user['username'], 'auth.login', 'Successful login');
}

echo json_encode([
    'status' => 'success',
    'user' => [
        'id' => $user['id'],
        'user_id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'role' => $user['role']
    ]
]);

$loginSql->close();
$db->close();
?>
