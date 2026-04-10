<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class RateLimitFilter implements FilterInterface
{
    protected $enabled;
    protected $maxRequests;
    protected $windowSeconds;
    
    public function __construct()
    {
        $this->enabled = getenv('SECURITY_RATE_LIMIT_ENABLED') !== 'false';
        $this->maxRequests = (int)(getenv('SECURITY_RATE_LIMIT_REQUESTS') ?: 100);
        $this->windowSeconds = (int)(getenv('SECURITY_RATE_LIMIT_WINDOW') ?: 60);
    }
    
    public function before(RequestInterface $request, $arguments = null)
    {
        if (!$this->enabled) {
            return null;
        }
        
        $identifier = $this->getIdentifier($request);
        $endpoint = $request->getUri()->getPath();
        
        if ($this->isRateLimited($identifier, $endpoint)) {
            log_message('warning', "Rate limit exceeded for {$identifier} on {$endpoint}");
            
            return service('response')->setJSON([
                'success' => false,
                'message' => 'Rate limit exceeded. Please try again later.',
                'code' => 429,
                'error_type' => 'rate_limit_exceeded',
                'retry_after' => $this->windowSeconds
            ])->setStatusCode(429)
              ->setHeader('Retry-After', $this->windowSeconds);
        }
        
        $this->incrementCounter($identifier, $endpoint);
        return null;
    }
    
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // No action needed
    }
    
    protected function getIdentifier(RequestInterface $request): string
    {
        // Try to get user ID first
        $userId = $GLOBALS['user_id'] ?? session()->get('user_id');
        if ($userId) {
            return 'user_' . $userId;
        }
        
        // Fall back to IP address
        return 'ip_' . $request->getIPAddress();
    }
    
    protected function isRateLimited(string $identifier, string $endpoint): bool
    {
        $db = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');
        $windowStart = date('Y-m-d H:i:s', time() - $this->windowSeconds);
        
        $record = $db->table('api_rate_limits')
            ->where('identifier', $identifier)
            ->where('endpoint', $endpoint)
            ->where('window_end >', $now)
            ->get()
            ->getRow();
        
        if (!$record) {
            return false;
        }
        
        return $record->requests_count >= $this->maxRequests;
    }
    
    protected function incrementCounter(string $identifier, string $endpoint): void
    {
        $db = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');
        $windowEnd = date('Y-m-d H:i:s', time() + $this->windowSeconds);
        
        $record = $db->table('api_rate_limits')
            ->where('identifier', $identifier)
            ->where('endpoint', $endpoint)
            ->where('window_end >', $now)
            ->get()
            ->getRow();
        
        if ($record) {
            $db->table('api_rate_limits')
                ->where('id', $record->id)
                ->update([
                    'requests_count' => $record->requests_count + 1,
                    'updated_at' => $now
                ]);
        } else {
            $db->table('api_rate_limits')->insert([
                'identifier' => $identifier,
                'endpoint' => $endpoint,
                'requests_count' => 1,
                'window_start' => $now,
                'window_end' => $windowEnd,
                'created_at' => $now
            ]);
        }
    }
}
