<?php
/**
 * Plugin Name: ZA Plate Assistant
 * Description: Endpoints para cargar y sobrescribir imagenes de usados (Autolarte).
 * Version: 1.0.0
 * Author: Zero Azul
 */

if (!defined('ABSPATH')) {
    exit;
}

function za_plate_get_uploads_dir() {
    $uploads = wp_upload_dir();
    $base = rtrim($uploads['basedir'], '/');
    $dir = $base . '/usados';
    if (!file_exists($dir)) {
        wp_mkdir_p($dir);
    }
    return $dir;
}

function za_plate_download_image($url) {
    $response = wp_remote_get($url, [
        'timeout' => 30,
        'redirection' => 5,
    ]);
    if (is_wp_error($response)) {
        return ['ok' => false, 'error' => $response->get_error_message()];
    }
    $code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    if ($code < 200 || $code >= 300) {
        return ['ok' => false, 'error' => 'HTTP ' . $code];
    }
    return ['ok' => true, 'data' => $body];
}

function za_plate_write_file($filename, $content) {
    $dir = za_plate_get_uploads_dir();
    $safeName = basename($filename);
    $path = $dir . '/' . $safeName;
    $bytes = file_put_contents($path, $content);
    if ($bytes === false) {
        return ['ok' => false, 'error' => 'No se pudo escribir el archivo'];
    }
    return ['ok' => true, 'path' => $path];
}

function za_plate_permission_check() {
    return current_user_can('upload_files');
}

function za_plate_upload(WP_REST_Request $request) {
    $plate = $request->get_param('plate');
    $side = $request->get_param('side');
    $imageBase64 = $request->get_param('image_base64');
    $imageUrl = $request->get_param('image_url');

    if (!$plate || !$side) {
        return new WP_REST_Response(['ok' => false, 'error' => 'plate y side son requeridos'], 400);
    }

    $filename = $plate . '-' . $side . '.png';
    if ($imageBase64) {
        $decoded = base64_decode($imageBase64);
        if ($decoded === false) {
            return new WP_REST_Response(['ok' => false, 'error' => 'base64 invalido'], 400);
        }
        $result = za_plate_write_file($filename, $decoded);
    } elseif ($imageUrl) {
        $download = za_plate_download_image($imageUrl);
        if (!$download['ok']) {
            return new WP_REST_Response(['ok' => false, 'error' => $download['error']], 400);
        }
        $result = za_plate_write_file($filename, $download['data']);
    } else {
        return new WP_REST_Response(['ok' => false, 'error' => 'image_base64 o image_url requerido'], 400);
    }

    if (!$result['ok']) {
        return new WP_REST_Response(['ok' => false, 'error' => $result['error']], 500);
    }

    $uploads = wp_upload_dir();
    $url = rtrim($uploads['baseurl'], '/') . '/usados/' . basename($filename);
    return new WP_REST_Response(['ok' => true, 'url' => $url], 200);
}

function za_plate_override(WP_REST_Request $request) {
    $filename = $request->get_param('filename');
    $imageBase64 = $request->get_param('image_base64');
    if (!$filename || !$imageBase64) {
        return new WP_REST_Response(['ok' => false, 'error' => 'filename e image_base64 son requeridos'], 400);
    }

    $decoded = base64_decode($imageBase64);
    if ($decoded === false) {
        return new WP_REST_Response(['ok' => false, 'error' => 'base64 invalido'], 400);
    }

    $result = za_plate_write_file($filename, $decoded);
    if (!$result['ok']) {
        return new WP_REST_Response(['ok' => false, 'error' => $result['error']], 500);
    }

    $uploads = wp_upload_dir();
    $url = rtrim($uploads['baseurl'], '/') . '/usados/' . basename($filename);
    return new WP_REST_Response(['ok' => true, 'url' => $url], 200);
}

function za_plate_list_large(WP_REST_Request $request) {
    $thresholdKb = intval($request->get_param('min_kb'));
    if ($thresholdKb <= 0) $thresholdKb = 600;

    $dir = za_plate_get_uploads_dir();
    $files = scandir($dir);
    $results = [];
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        $path = $dir . '/' . $file;
        if (!is_file($path)) continue;
        $size = filesize($path);
        if ($size === false) continue;
        if ($size < ($thresholdKb * 1024)) continue;
        $results[] = ['filename' => $file, 'size' => $size];
    }
    return new WP_REST_Response(['ok' => true, 'files' => $results], 200);
}

function za_plate_get_base64(WP_REST_Request $request) {
    $filename = $request->get_param('filename');
    $plate = $request->get_param('plate');
    $side = $request->get_param('side');
    if (!$filename && $plate && $side) {
        $filename = $plate . '-' . $side . '.png';
    }
    if (!$filename) {
        return new WP_REST_Response(['ok' => false, 'error' => 'filename o plate/side requeridos'], 400);
    }
    $dir = za_plate_get_uploads_dir();
    $safeName = basename($filename);
    $path = $dir . '/' . $safeName;
    if (!file_exists($path)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'archivo no encontrado'], 404);
    }
    $content = file_get_contents($path);
    if ($content === false) {
        return new WP_REST_Response(['ok' => false, 'error' => 'no se pudo leer el archivo'], 500);
    }
    $type = wp_check_filetype($path);
    $mime = $type['type'] ? $type['type'] : 'application/octet-stream';
    return new WP_REST_Response([
        'ok' => true,
        'filename' => $safeName,
        'mime' => $mime,
        'base64' => base64_encode($content),
    ], 200);
}

add_action('rest_api_init', function () {
    register_rest_route('za-plate/v1', '/upload', [
        'methods' => 'POST',
        'permission_callback' => 'za_plate_permission_check',
        'callback' => 'za_plate_upload',
    ]);
    register_rest_route('za-plate/v1', '/override', [
        'methods' => 'POST',
        'permission_callback' => 'za_plate_permission_check',
        'callback' => 'za_plate_override',
    ]);
    register_rest_route('za-plate/v1', '/list-large', [
        'methods' => 'GET',
        'permission_callback' => 'za_plate_permission_check',
        'callback' => 'za_plate_list_large',
    ]);
    register_rest_route('za-plate/v1', '/get-base64', [
        'methods' => 'GET',
        'permission_callback' => 'za_plate_permission_check',
        'callback' => 'za_plate_get_base64',
    ]);
});
