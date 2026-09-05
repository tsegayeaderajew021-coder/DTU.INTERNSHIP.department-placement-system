<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once __DIR__ . '/../../config/db_config.php';
$db = getDbConnection();

$data = json_decode(file_get_contents("php://input"), true);

$sql = "UPDATE placement_settings SET 
        gpa_weight = {$data['gpa_weight']},
        grade_12_weight = {$data['grade_12_weight']},
        coc_weight = {$data['coc_weight']},
        gender_weight = {$data['gender_weight']},
        disability_weight = {$data['disability_weight']},
        minority_weight = {$data['minority_weight']}
        WHERE id = 1";

if ($db->query($sql)) {
    echo json_encode(["success" => true, "message" => "Rules updated successfully"]);
} else {
    echo json_encode(["success" => false, "message" => $db->error]);
}
$db->close();
?>