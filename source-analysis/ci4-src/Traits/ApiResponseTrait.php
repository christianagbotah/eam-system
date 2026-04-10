<?php

namespace App\Traits;

use CodeIgniter\HTTP\ResponseInterface;

trait ApiResponseTrait
{
    protected function successResponse($data = null, string $message = 'Success', int $code = 200, array $meta = [])
    {
        return $this->response->setJSON([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => $meta
        ])->setStatusCode($code);
    }

    protected function errorResponse(string $message = 'Error', int $code = 400, $errors = null)
    {
        return $this->response->setJSON([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
            'code' => $code
        ])->setStatusCode($code);
    }

    protected function paginatedResponse($data, int $page, int $perPage, int $total, string $message = 'Success')
    {
        return $this->successResponse($data, $message, 200, [
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total)
            ]
        ]);
    }

    protected function createdResponse($data, string $message = 'Resource created successfully')
    {
        return $this->successResponse($data, $message, 201);
    }

    protected function noContentResponse()
    {
        return $this->response->setStatusCode(204);
    }

    protected function unauthorizedResponse(string $message = 'Unauthorized')
    {
        return $this->errorResponse($message, 401);
    }

    protected function forbiddenResponse(string $message = 'Forbidden')
    {
        return $this->errorResponse($message, 403);
    }

    protected function notFoundResponse(string $message = 'Resource not found')
    {
        return $this->errorResponse($message, 404);
    }

    protected function validationErrorResponse($errors, string $message = 'Validation failed')
    {
        return $this->errorResponse($message, 422, $errors);
    }
}
