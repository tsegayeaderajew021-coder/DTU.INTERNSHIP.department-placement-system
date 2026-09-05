<?php
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../../config/db_config.php';
require_once __DIR__ . '/../../config/logger.php';

function adminMessageResponse(array $payload, int $status = 200): void
{
	http_response_code($status);
	echo json_encode($payload);
	exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') adminMessageResponse(['success' => true]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') adminMessageResponse(['success' => false, 'message' => 'Only POST requests are allowed.'], 405);

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
$adminId = (int) ($_SESSION['user_id'] ?? 0);
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$subject = trim((string) ($input['subject'] ?? ''));
$message = trim((string) ($input['message'] ?? ''));

if ($adminId <= 0) adminMessageResponse(['success' => false, 'message' => 'You must be logged in as an administrator.'], 401);
if ($message === '') adminMessageResponse(['success' => false, 'message' => 'Write a message before sending.'], 400);
if (mb_strlen($subject) > 180) adminMessageResponse(['success' => false, 'message' => 'The subject must be 180 characters or fewer.'], 400);
if (mb_strlen($message) > 10000) adminMessageResponse(['success' => false, 'message' => 'The message must be 10,000 characters or fewer.'], 400);

try {
	$pdo = getAuditPdo();
	$actor = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
	$actor->execute([':id' => $adminId]);
	$role = strtolower((string) ($actor->fetchColumn() ?: ''));
	if ($role !== 'admin') adminMessageResponse(['success' => false, 'message' => 'Only administrators can send these messages.'], 403);

	$title = $subject !== '' ? $subject : 'Message from Admin';
	$statement = $pdo->prepare(
		'INSERT INTO notifications (sender_id, sender_role, recipient_id, recipient_role, title, message)
		 VALUES (:sender_id, :sender_role, NULL, :recipient_role, :title, :message)'
	);
	$statement->execute([
		':sender_id' => $adminId,
		':sender_role' => 'admin',
		':recipient_role' => 'registrar',
		':title' => $title,
		':message' => $message,
	]);
	adminMessageResponse(['success' => true, 'message' => 'Message sent to the Registrar.']);
} catch (Throwable $error) {
	error_log('Admin send message failed: ' . $error->getMessage());
	adminMessageResponse(['success' => false, 'message' => 'Unable to send the message.'], 500);
}
?>
