<?php

namespace App\Libraries;

class CacheService
{
    private $redis;
    private $enabled = false;

    public function __construct()
    {
        if (extension_loaded('redis')) {
            try {
                $this->redis = new \Redis();
                $this->redis->connect('127.0.0.1', 6379);
                $this->enabled = true;
            } catch (\Exception $e) {
                log_message('error', 'Redis connection failed: ' . $e->getMessage());
            }
        }
    }

    public function get($key)
    {
        if (!$this->enabled) return null;
        
        $data = $this->redis->get($key);
        return $data ? json_decode($data, true) : null;
    }

    public function set($key, $data, $ttl = 300)
    {
        if (!$this->enabled) return false;
        
        return $this->redis->setex($key, $ttl, json_encode($data));
    }

    public function invalidate($pattern)
    {
        if (!$this->enabled) return false;
        
        $keys = $this->redis->keys($pattern);
        if (!empty($keys)) {
            return $this->redis->del($keys);
        }
        return true;
    }

    public function remember($key, $ttl, $callback)
    {
        $cached = $this->get($key);
        if ($cached !== null) {
            return $cached;
        }

        $data = $callback();
        $this->set($key, $data, $ttl);
        return $data;
    }
}
