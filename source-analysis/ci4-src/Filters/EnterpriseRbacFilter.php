<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use App\Config\Permissions;

/**
 * Enterprise RBAC Filter
 * Enforces role-based access control on API endpoints
 */
class EnterpriseRbacFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Get authenticated user
        $user = JWTAuthFilter::getUserData();
        
        if (!$user) {
            return service('response')->setJSON([
                'success' => false,
                'error' => 'unauthorized',
                'message' => 'Authentication required',
                'code' => 401
            ])->setStatusCode(401);
        }

        // Get required permission from arguments
        $requiredPermission = $arguments[0] ?? null;
        
        if (!$requiredPermission) {
            return service('response')->setJSON([
                'success' => false,
                'error' => 'forbidden',
                'message' => 'Permission not specified',
                'code' => 403
            ])->setStatusCode(403);
        }

        // Admin has full access
        if ($user['role'] === 'admin') {
            return null;
        }

        // Check if user's role has the required permission
        if (!Permissions::roleHasPermission($user['role'], $requiredPermission)) {
            return service('response')->setJSON([
                'success' => false,
                'error' => 'forbidden',
                'message' => 'Insufficient permissions. Required: ' . $requiredPermission,
                'code' => 403,
                'required_permission' => $requiredPermission,
                'user_role' => $user['role']
            ])->setStatusCode(403);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Nothing to do here
    }
}
