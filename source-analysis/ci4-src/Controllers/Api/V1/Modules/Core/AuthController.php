<?php

namespace App\Controllers\Api\V1\Modules\Core;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\EamAuthService;

class AuthController extends BaseApiController
{
    protected $authService;

    public function __construct()
    {
        $this->authService = new EamAuthService();
    }

    public function login()
    {
        $data = $this->request->getJSON(true);
        $result = $this->authService->login($data);
        
        if (isset($result['status']) && $result['status'] === 'error') {
            return $this->respond($result, 401);
        }
        
        return $this->respond($result);
    }

    public function logout()
    {
        $token = $this->request->getHeaderLine('Authorization');
        $result = $this->authService->logout($token);
        return $this->respond($result);
    }

    public function refresh()
    {
        $data = $this->request->getJSON(true);
        $result = $this->authService->refresh($data['refresh_token'] ?? '');
        
        if (isset($result['status']) && $result['status'] === 'error') {
            return $this->respond($result, 401);
        }
        
        return $this->respond($result);
    }
}

