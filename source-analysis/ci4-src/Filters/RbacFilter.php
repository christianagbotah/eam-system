<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use App\Services\PermissionService;

class RbacFilter implements FilterInterface
{
    protected $permissionService;

    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }

    public function before(RequestInterface $request, $arguments = null)
    {
        $user = \App\Filters\JWTAuthFilter::getUserData();
        
        if (!$user) {
            return service('response')->setJSON([
                'success' => false,
                'error' => 'unauthorized',
                'message' => 'Authentication required',
                'code' => 401
            ])->setStatusCode(401);
        }

        $permission = $arguments[0] ?? null;
        
        if (!$permission) {
            return service('response')->setJSON([
                'success' => false,
                'error' => 'forbidden',
                'message' => 'Permission not specified',
                'code' => 403
            ])->setStatusCode(403);
        }

        if (!$this->permissionService->userHasPermission($user['id'], $permission)) {
            return service('response')->setJSON([
                'success' => false,
                'error' => 'forbidden',
                'message' => 'Insufficient permissions',
                'code' => 403
            ])->setStatusCode(403);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Nothing to do here
    }
}