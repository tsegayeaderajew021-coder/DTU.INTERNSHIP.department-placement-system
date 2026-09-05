<?php
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../config/db_config.php';
$db = getDbConnection();

function sendJson(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function normalizeText($value): string
{
    return trim((string) $value);
}

function tableExists(mysqli $db, string $table): bool
{
    $result = $db->query("SHOW TABLES LIKE '" . $db->real_escape_string($table) . "'");
    return $result && $result->num_rows > 0;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method !== 'POST') {
        sendJson(['success' => false, 'message' => 'Only POST requests are allowed.'], 405);
    }

    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);

    if (!is_array($payload)) {
        sendJson(['success' => false, 'message' => 'Invalid JSON payload.'], 400);
    }

    $students = [];
    if (isset($payload['students']) && is_array($payload['students'])) {
        $students = $payload['students'];
    } elseif (isset($payload['registrations']) && is_array($payload['registrations'])) {
        $students = $payload['registrations'];
    } elseif (isset($payload['data']) && is_array($payload['data'])) {
        $students = $payload['data'];
    } elseif (isset($payload['records']) && is_array($payload['records'])) {
        $students = $payload['records'];
    } else {
        sendJson(['success' => false, 'message' => 'No student records were provided.'], 400);
    }

    if (count($students) === 0) {
        sendJson(['success' => false, 'message' => 'Student list is empty.'], 400);
    }

    $defaultPassword = '123456';
    $hashedDefaultPassword = password_hash($defaultPassword, PASSWORD_DEFAULT);
    $newCount = 0;
    $updatedCount = 0;
    $skippedCount = 0;
    $errors = [];

    foreach ($students as $student) {
        if (!is_array($student)) {
            $skippedCount++;
            continue;
        }

        $username = normalizeText($student['username'] ?? $student['name'] ?? '');
        $email = strtolower(normalizeText($student['email'] ?? ''));
        $gpa = isset($student['gpa']) ? (float) $student['gpa'] : 0.0;
        $stream = normalizeText($student['stream'] ?? $student['department_stream'] ?? '');

        if ($username === '' || $email === '') {
            $skippedCount++;
            $errors[] = 'Skipped one record because username or email was missing.';
            continue;
        }

        $checkUser = $db->prepare('SELECT id, password FROM users WHERE email = ? LIMIT 1');
        $checkUser->bind_param('s', $email);
        $checkUser->execute();
        $userResult = $checkUser->get_result();

        $userId = null;
        if ($userResult && $userResult->num_rows > 0) {
            $existingUser = $userResult->fetch_assoc();
            $userId = (int) $existingUser['id'];

            $updateUser = $db->prepare('UPDATE users SET username = ?, role = ? WHERE id = ? LIMIT 1');
            $role = 'student';
            $updateUser->bind_param('ssi', $username, $role, $userId);
            if (!$updateUser->execute()) {
                $errors[] = 'Failed to update user for email: ' . $email;
                continue;
            }
            $updatedCount++;
        } else {
            $insertUser = $db->prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)');
            $role = 'student';
            $insertUser->bind_param('ssss', $username, $email, $hashedDefaultPassword, $role);
            if (!$insertUser->execute()) {
                $errors[] = 'Failed to create user for email: ' . $email;
                continue;
            }
            $userId = $db->insert_id;
            $newCount++;
        }

        if (!tableExists($db, 'student_data')) {
            $errors[] = 'student_data table does not exist in the database.';
            continue;
        }

        $studentCheck = $db->prepare('SELECT id FROM student_data WHERE email = ? LIMIT 1');
        $studentCheck->bind_param('s', $email);
        $studentCheck->execute();
        $studentResult = $studentCheck->get_result();

        if ($studentResult && $studentResult->num_rows > 0) {
            $studentRow = $studentResult->fetch_assoc();
            $studentId = (int) $studentRow['id'];

            $updateStudent = $db->prepare('UPDATE student_data SET username = ?, gpa = ?, stream = ?, user_id = ? WHERE id = ? LIMIT 1');
            $updateStudent->bind_param('sdiii', $username, $gpa, $stream, $userId, $studentId);
            if (!$updateStudent->execute()) {
                $errors[] = 'Failed to update student record for email: ' . $email;
                continue;
            }
            $updatedCount++;
        } else {
            $insertStudent = $db->prepare('INSERT INTO student_data (user_id, username, email, gpa, stream) VALUES (?, ?, ?, ?, ?)');
            $insertStudent->bind_param('issds', $userId, $username, $email, $gpa, $stream);
            if (!$insertStudent->execute()) {
                $errors[] = 'Failed to insert student record for email: ' . $email;
                continue;
            }
            $newCount++;
        }
    }

    sendJson([
        'success' => true,
        'message' => 'Student registration import completed successfully.',
        'summary' => [
            'created' => $newCount,
            'updated' => $updatedCount,
            'skipped' => $skippedCount,
        ],
        'default_password' => $defaultPassword,
        'errors' => $errors,
    ]);
} catch (Exception $e) {
    sendJson([
        'success' => false,
        'message' => 'Server error while importing registrations.',
        'error' => $e->getMessage(),
    ], 500);
}
?>
