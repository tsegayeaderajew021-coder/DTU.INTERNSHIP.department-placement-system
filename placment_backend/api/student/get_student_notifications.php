<?php
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

require_once __DIR__ . '/../../config/db_config.php';
$db = getDbConnection();

// Get the recipient user ID from the request
$student_id = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;

if ($student_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid Student ID']);
    exit;
}

try {
    // 1. Fetch notifications for this specific student
    // 2. Join with any other relevant info if needed
    // 3. Order by newest first
    $query = "SELECT id, sender_role, title, message, file_path, is_read, created_at 
              FROM notifications 
              WHERE recipient_id = ? OR (recipient_role = 'student' AND recipient_id IS NULL)
              ORDER BY created_at DESC";
              
    $stmt = $db->prepare($query);
    $stmt->bind_param("i", $student_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        // Construct a full URL for the file so React can open it
        if (!empty($row['file_path'])) {
            $row['file_url'] = "http://localhost/placment_backend/" . $row['file_path'];
        }
        $notifications[] = $row;
    }

    echo json_encode([
        'success' => true,
        'notifications' => $notifications
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$db->close();
?>