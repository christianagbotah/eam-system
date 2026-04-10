<?php

namespace App\Helpers;

class ApiResponse
{
    /**
     * Success response with data
     */
    public static function success($data = null, string $message = '', int $code = 200, array $meta = [])
    {
        $response = [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c'),
            'request_id' => self::getRequestId()
        ];
        
        if (!empty($meta)) {
            $response['meta'] = $meta;
        }
        
        return service('response')
            ->setJSON($response)
            ->setStatusCode($code);
    }
    
    /**
     * Error response
     */
    public static function error(string $message, int $code = 400, $errors = null, string $errorType = 'validation_error')
    {
        $response = [
            'success' => false,
            'message' => $message,
            'error_type' => $errorType,
            'code' => $code,
            'timestamp' => date('c'),
            'request_id' => self::getRequestId()
        ];
        
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        
        // Log error for monitoring
        log_message('error', sprintf(
            'API Error [%s]: %s - Request ID: %s',
            $code,
            $message,
            self::getRequestId()
        ));
        
        return service('response')
            ->setJSON($response)
            ->setStatusCode($code);
    }
    
    /**
     * Paginated response
     */
    public static function paginated($data, int $total, int $page, int $perPage, string $message = '')
    {
        $lastPage = ceil($total / $perPage);
        
        return self::success($data, $message, 200, [
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'last_page' => $lastPage,
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total),
                'has_more' => $page < $lastPage
            ]
        ]);
    }
    
    /**
     * Validation error response
     */
    public static function validationError(array $errors, string $message = 'Validation failed')
    {
        return self::error($message, 422, $errors, 'validation_error');
    }
    
    /**
     * Not found response
     */
    public static function notFound(string $resource = 'Resource')
    {
        return self::error("{$resource} not found", 404, null, 'not_found');
    }
    
    /**
     * Unauthorized response
     */
    public static function unauthorized(string $message = 'Unauthorized access')
    {
        return self::error($message, 401, null, 'unauthorized');
    }
    
    /**
     * Forbidden response
     */
    public static function forbidden(string $message = 'Access forbidden')
    {
        return self::error($message, 403, null, 'forbidden');
    }
    
    /**
     * Server error response
     */
    public static function serverError(string $message = 'Internal server error')
    {
        // Don't expose internal errors in production
        if (ENVIRONMENT === 'production') {
            $message = 'An unexpected error occurred. Please try again later.';
        }
        
        return self::error($message, 500, null, 'server_error');
    }
    
    /**
     * Rate limit exceeded response
     */
    public static function rateLimitExceeded(int $retryAfter = 60)
    {
        $response = self::error(
            'Rate limit exceeded. Please try again later.',
            429,
            null,
            'rate_limit_exceeded'
        );
        
        return $response->setHeader('Retry-After', $retryAfter);
    }
    
    /**
     * Generate unique request ID
     */
    private static function getRequestId(): string
    {
        static $requestId = null;
        
        if ($requestId === null) {
            $requestId = bin2hex(random_bytes(8));
        }
        
        return $requestId;
    }
    
    /**
     * Created response (201)
     */
    public static function created($data, string $message = 'Resource created successfully')
    {
        return self::success($data, $message, 201);
    }
    
    /**
     * No content response (204)
     */
    public static function noContent()
    {
        return service('response')->setStatusCode(204);
    }
    
    /**
     * Accepted response (202)
     */
    public static function accepted($data = null, string $message = 'Request accepted for processing')
    {
        return self::success($data, $message, 202);
    }
}
