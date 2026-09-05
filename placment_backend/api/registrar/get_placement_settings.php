<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Content-Type: application/json");
require_once __DIR__ . '/../../config/db_config.php';
$db = getDbConnection();

$result = $db->query("SELECT * FROM placement_settings WHERE id = 1");
$settings = $result->fetch_assoc();

echo json_encode($settings);
$db->close();
?>