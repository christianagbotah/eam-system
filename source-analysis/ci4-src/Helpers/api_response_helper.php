<?php

if (!function_exists('apiSuccess')) {
    function apiSuccess($data = null, string $message = 'Success', int $code = 200): array
    {
        return [
            'status' => $code,
            'message' => $message,
            'data' => $data
        ];
    }
}

if (!function_exists('apiError')) {
    function apiError(string $message, int $code = 400, array $errors = []): array
    {
        $response = [
            'status' => $code,
            'message' => $message
        ];
        
        if (!empty($errors)) {
            $response['errors'] = $errors;
        }
        
        return $response;
    }
}

if (!function_exists('apiPaginated')) {
    function apiPaginated(array $data, array $pagination, string $message = 'Success'): array
    {
        return [
            'status' => 200,
            'message' => $message,
            'data' => $data,
            'pagination' => $pagination
        ];
    }
}
