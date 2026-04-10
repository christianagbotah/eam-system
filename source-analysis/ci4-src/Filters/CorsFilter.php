<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class CorsFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        header('Access-Control-Allow-Origin: ' . ($request->getHeaderLine('Origin') ?: '*'));
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Plant-Id, x-plant-id, X-Requested-With, Accept');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 3600');
        
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
        
        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}
