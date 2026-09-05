<?php
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../../config/db_config.php';

function headSendResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') headSendResponse(['success' => true]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') headSendResponse(['success' => false, 'message' => 'Only POST requests are allowed.'], 405);
if (session_status() !== PHP_SESSION_ACTIVE) session_start();

$senderId = (int) ($_SESSION['user_id'] ?? 0);
$senderRole = strtolower((string) ($_SESSION['role'] ?? ''));
$recipientType = strtolower(trim((string) ($_POST['recipient_type'] ?? '')));
$studentId = isset($_POST['student_id']) && is_numeric($_POST['student_id']) ? (int) $_POST['student_id'] : 0;
$message = trim((string) ($_POST['message'] ?? ''));

if ($senderId <= 0 || !in_array($senderRole, ['head', 'hod', 'coordinator'], true)) headSendResponse(['success' => false, 'message' => 'Only department heads can send messages.'], 403);
if (!in_array($recipientType, ['student', 'all_students', 'registrar'], true)) headSendResponse(['success' => false, 'message' => 'Choose a valid recipient.'], 400);
if ($message === '') headSendResponse(['success' => false, 'message' => 'Enter a message before sending.'], 400);
if (strlen($message) > 10000) headSendResponse(['success' => false, 'message' => 'The message is too long.'], 400);

$db = getDbConnection();
try {
    $departmentStatement = $db->prepare("SELECT id FROM departments WHERE head_id = ? AND status = 'active' LIMIT 1");
    if (!$departmentStatement) throw new Exception('Unable to load the assigned department.');
    $departmentStatement->bind_param('i', $senderId);
    $departmentStatement->execute();
    $department = $departmentStatement->get_result()->fetch_assoc();
    $departmentStatement->close();
    if (!$department) headSendResponse(['success' => false, 'message' => 'No active department is assigned to this head.'], 403);
    $departmentId = (int) $department['id'];

    $recipientRole = $recipientType === 'registrar' ? 'registrar' : 'student';
    $recipientIds = [];
    if ($recipientType === 'student') {
        if ($studentId <= 0) headSendResponse(['success' => false, 'message' => 'Select a student recipient.'], 400);
        $studentStatement = $db->prepare('SELECT pr.student_id FROM placement_results pr WHERE pr.student_id = ? AND pr.dept_id = ? LIMIT 1');
        if (!$studentStatement) throw new Exception('Unable to validate the student recipient.');
        $studentStatement->bind_param('ii', $studentId, $departmentId);
        $studentStatement->execute();
        if (!$studentStatement->get_result()->fetch_assoc()) headSendResponse(['success' => false, 'message' => 'The selected student is not assigned to your department.'], 403);
        $studentStatement->close();
        $recipientIds[] = $studentId;
    } elseif ($recipientType === 'all_students') {
        $studentsStatement = $db->prepare('SELECT DISTINCT student_id FROM placement_results WHERE dept_id = ?');
        if (!$studentsStatement) throw new Exception('Unable to load department students.');
        $studentsStatement->bind_param('i', $departmentId);
        $studentsStatement->execute();
        $result = $studentsStatement->get_result();
        while ($row = $result->fetch_assoc()) $recipientIds[] = (int) $row['student_id'];
        $studentsStatement->close();
        if (!$recipientIds) headSendResponse(['success' => false, 'message' => 'No students are assigned to your department.'], 400);
    } else {
        $recipientIds[] = null;
    }

    $db->begin_transaction();
    $statement = $db->prepare('INSERT INTO notifications (sender_id, sender_role, recipient_id, recipient_role, department_id, title, message) VALUES (?, ?, ?, ?, ?, ?, ?)');
    if (!$statement) throw new Exception('Unable to prepare the message.');
    $title = 'Message from Department Head';
    foreach ($recipientIds as $recipientId) {
        $statement->bind_param('isisiss', $senderId, $senderRole, $recipientId, $recipientRole, $departmentId, $title, $message);
        if (!$statement->execute()) throw new Exception('Unable to save the message.');
    }
    $statement->close();
    $db->commit();
    $label = $recipientType === 'registrar' ? 'Registrar' : ($recipientType === 'all_students' ? 'all students' : 'student');
    headSendResponse(['success' => true, 'message' => "Message sent to {$label}."]);
} catch (Throwable $error) {
    if ($db->errno === 0) { /* no-op */ }
    if ($db->thread_id) $db->rollback();
    headSendResponse(['success' => false, 'message' => $error->getMessage()], 500);
} finally {
    $db->close();
}
?>