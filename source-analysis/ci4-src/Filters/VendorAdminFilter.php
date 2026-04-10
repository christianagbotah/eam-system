<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class VendorAdminFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        
        if (!$userData) {
            return service('response')
                ->setJSON([
                    'status' => 'error',
                    'message' => 'Unauthorized access'
                ])
                ->setStatusCode(401);
        }
        
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        if (!$userId) {
            return service('response')
                ->setJSON([
                    'status' => 'error',
                    'message' => 'Invalid user data'
                ])
                ->setStatusCode(401);
        }
        
        // Check if user is vendor admin
        $db = \Config\Database::connect();
        $user = $db->table('users')
            ->select('is_vendor_admin, role')
            ->where('id', $userId)
            ->get()
            ->getRow();
        
        if (!$user || !$user->is_vendor_admin) {
            return service('response')
                ->setJSON([
                    'status' => 'error',
                    'message' => 'Access denied. Vendor administrator privileges required.'
                ])
                ->setStatusCode(403);
        }
        
        return $request;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}
