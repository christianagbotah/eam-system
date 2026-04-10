<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\RBACConfig;

class RBACFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $session = session();
        $userRole = $session->get('role');
        
        if (!$userRole) {
            return service('response')->setJSON(['error' => 'Unauthorized'])->setStatusCode(401);
        }

        $uri = $request->getUri()->getPath();
        $method = $request->getMethod();
        
        // Extract module from URI
        $module = $this->extractModule($uri);
        $action = $this->mapMethodToAction($method);
        
        if ($module && !RBACConfig::hasPermission($userRole, $module, $action)) {
            return service('response')->setJSON(['error' => 'Access denied'])->setStatusCode(403);
        }

        return $request;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }

    private function extractModule($uri)
    {
        $patterns = [
            '/failure-analysis|rca|capa/' => 'failure_analysis',
            '/work-order/' => 'work_orders',
            '/pm-schedule/' => 'pm_schedules',
            '/inventory/' => 'inventory',
            '/parts/' => 'parts',
            '/material-request/' => 'material_requests',
            '/calibration/' => 'calibration',
            '/downtime/' => 'downtime',
            '/oee/' => 'oee',
            '/training/' => 'training',
            '/risk/' => 'risk_assessment',
            '/reports/' => 'reports'
        ];

        foreach ($patterns as $pattern => $module) {
            if (preg_match($pattern, $uri)) return $module;
        }

        return null;
    }

    private function mapMethodToAction($method)
    {
        return match($method) {
            'GET' => 'view',
            'POST' => 'create',
            'PUT', 'PATCH' => 'edit',
            'DELETE' => 'delete',
            default => 'view'
        };
    }
}
