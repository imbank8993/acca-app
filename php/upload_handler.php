<?php
/**
 * PHP Upload Handler for Academic App
 * Place this file at: https://icgowa.sch.id/akademik.icgowa.sch.id/upload_handler.php
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json'); // PENTING: Selalu set sebagai JSON

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$base_dir = "akademik_upload/";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['category']) || !isset($_FILES['file'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing category or file data."]);
        exit;
    }

    $category = preg_replace('/[^A-Za-z0-9_\- ]/', '', $_POST['category']);
    $target_dir = $base_dir . $category . "/";

    if (!file_exists($target_dir)) {
        if (!mkdir($target_dir, 0755, true)) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Gagal membuat folder di server. Cek permission folder."]);
            exit;
        }
    }

    $file_name = basename($_FILES["file"]["name"]);
    $file_name = time() . "_" . preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $file_name);
    $target_file = $target_dir . $file_name;

    if (move_uploaded_file($_FILES["file"]["tmp_name"], $target_file)) {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
        $host = $_SERVER['HTTP_HOST'];
        $full_url = $protocol . "://" . $host . "/akademik.icgowa.sch.id/" . $target_file;

        echo json_encode([
            "status" => "success",
            "message" => "File uploaded successfully.",
            "file_url" => $full_url,
            "file_path" => $target_file,
            "file_name" => $file_name
        ]);
    } else {
        http_response_code(500);
        $error = error_get_last();
        echo json_encode(["status" => "error", "message" => "Gagal memindahkan file ke folder tujuan.", "debug" => $error]);
    }
} else {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);
}
?>