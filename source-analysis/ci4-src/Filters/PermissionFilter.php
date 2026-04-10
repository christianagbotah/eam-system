<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use App\Services\Permission\PermissionService;

class PermissionFilter implements FilterInterface
{
    protected $permissionService;

    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }

    public function before(RequestInterface $request, $arguments = null)
    {
        $userId = session()->get('user_id');

        if (!$userId) {
            return redirect()->to('/login')->with('error', 'Please login to continue');
        }

        if (empty($arguments)) {
            return null;
        }

        $requiredPermissions = is_array($arguments) ? $arguments : [$arguments];
        
        $hasPermission = false;
        foreach ($requiredPermissions as $permission) {
            if ($this->permissionService->hasPermission($userId, $permission)) {
                $hasPermission = true;
                break;
            }
        }

        if (!$hasPermission) {
            if ($request->isAJAX()) {
                return service('response')
                    ->setJSON([
                        'success' => false,
                        'message' => 'You do not have permission to access this resource'
                    ])
                    ->setStatusCode(403);
            }

            return redirect()->back()->with('error', 'You do not have permission to access this resource');
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}
