<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class Cors extends BaseConfig
{
    public $allowedOrigins = ['http://localhost:3000', 'http://localhost'];
    public $allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    public $allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'];
    public $exposedHeaders = [];
    public $maxAge = 7200;
    public $supportsCredentials = true;
}
