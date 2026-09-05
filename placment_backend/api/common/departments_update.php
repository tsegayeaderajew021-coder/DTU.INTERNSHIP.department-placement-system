<?php
// 1. CORS ፈቃድ - ለ 3000 እና 3001 ፖርት
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

include __DIR__ . '/../../config/db_config.php';
require_once __DIR__ . '/../../config/logger.php';
$db = getDbConnection();
$auditActor = getAuditActor($db);

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $updates = isset($data['departments']) ? $data['departments'] : [];

    if (empty($updates)) {
        echo json_encode(["success" => false, "message" => "ምንም ዳታ አልደረሰኝም።"]);
        exit;
    }

    $successCount = 0;
    foreach ($updates as $dept) {
        $id = (int)$dept['id']; // እዚህ ጋር ID ቁጥር መሆኑን ያረጋግጣል
        $capacity = (int)$dept['capacity'];

        if ($id > 0) {
            $sql = "UPDATE departments SET capacity = $capacity WHERE id = $id";
            if ($db->query($sql)) {
                $successCount++;
            }
        }
    }

    echo json_encode([
        "success" => true, 
        "message" => "በተሳካ ሁኔታ የ $successCount ዲፓርትመንቶች አቅም በዳታቤዝ ተዘምኗል!"
    ]);
    logActivity($db, $auditActor['id'], $auditActor['name'], 'department.capacity_update', json_encode(['updated_count' => $successCount]));
}
$db->close();
?>