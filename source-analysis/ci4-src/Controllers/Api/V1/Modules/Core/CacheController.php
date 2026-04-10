<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;
use App\Libraries\CacheService;

class CacheController extends ResourceController
{
    protected $format = 'json';
    protected $cache;

    public function __construct()
    {
        $this->cache = new CacheService();
    }

    public function clear()
    {
        $this->cache->invalidate('*');
        
        return $this->respond([
            'success' => true,
            'message' => 'All cache cleared'
        ]);
    }

    public function clearPattern($pattern)
    {
        $this->cache->invalidate($pattern . '*');
        
        return $this->respond([
            'success' => true,
            'message' => "Cache cleared for pattern: {$pattern}"
        ]);
    }
}
