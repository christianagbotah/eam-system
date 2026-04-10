<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\CLIRequest;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Psr\Log\LoggerInterface;
use App\Services\Permission\PermissionService;

abstract class BaseController extends Controller
{
    protected $request;
    protected $helpers = ['permission'];
    protected $permissionService;
    protected $userId;

    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger)
    {
        parent::initController($request, $response, $logger);
        
        $this->permissionService = new PermissionService();
        $this->userId = session()->get('user_id');
    }

    protected function can(string $permission): bool
    {
        if (!$this->userId) {
            return false;
        }

        return $this->permissionService->hasPermission($this->userId, $permission);
    }

    protected function canAny(array $permissions): bool
    {
        if (!$this->userId) {
            return false;
        }

        return $this->permissionService->hasAnyPermission($this->userId, $permissions);
    }

    protected function canAll(array $permissions): bool
    {
        if (!$this->userId) {
            return false;
        }

        return $this->permissionService->hasAllPermissions($this->userId, $permissions);
    }

    protected function authorize(string $permission): void
    {
        if (!$this->can($permission)) {
            $this->handleUnauthorized($permission);
        }
    }

    protected function authorizeAny(array $permissions): void
    {
        if (!$this->canAny($permissions)) {
            $this->handleUnauthorized(implode(', ', $permissions));
        }
    }

    protected function authorizeAll(array $permissions): void
    {
        if (!$this->canAll($permissions)) {
            $this->handleUnauthorized(implode(', ', $permissions));
        }
    }

    protected function handleUnauthorized(string $permission): void
    {
        if ($this->request->isAJAX()) {
            $this->response->setJSON([
                'success' => false,
                'message' => "You don't have permission: {$permission}"
            ])->setStatusCode(403)->send();
            exit;
        }

        session()->setFlashdata('error', "You don't have permission to perform this action");
        redirect()->back()->send();
        exit;
    }

    protected function jsonResponse(bool $success, $data = null, string $message = '', int $statusCode = 200)
    {
        $response = [
            'success' => $success,
            'message' => $message
        ];

        if ($data !== null) {
            $response['data'] = $data;
        }

        return $this->response
            ->setJSON($response)
            ->setStatusCode($statusCode);
    }

    protected function successResponse($data = null, string $message = 'Success')
    {
        return $this->jsonResponse(true, $data, $message, 200);
    }

    protected function errorResponse(string $message = 'Error', int $statusCode = 400)
    {
        return $this->jsonResponse(false, null, $message, $statusCode);
    }

    protected function unauthorizedResponse(string $message = 'Unauthorized')
    {
        return $this->jsonResponse(false, null, $message, 403);
    }

    protected function notFoundResponse(string $message = 'Resource not found')
    {
        return $this->jsonResponse(false, null, $message, 404);
    }

    protected function validationErrorResponse(array $errors)
    {
        return $this->jsonResponse(false, ['errors' => $errors], 'Validation failed', 422);
    }
}
