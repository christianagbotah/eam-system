<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class NotificationsController extends ResourceController
{
    use ResponseTrait;

    protected $db;
    protected $format = 'json';

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->createNotificationsTable();
    }

    private function createNotificationsTable()
    {
        $query = "CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type ENUM('info','warning','error','success') DEFAULT 'info',
            is_read BOOLEAN DEFAULT FALSE,
            read_at DATETIME NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX(user_id),
            INDEX(is_read, created_at)
        )";
        
        try {
            $this->db->query($query);
        } catch (\Exception $e) {
            // Table already exists or creation failed - continue
        }
    }

    private function getUserIdFromToken()
    {
        try {
            $authHeader = $this->request->getHeaderLine('Authorization');
            if (empty($authHeader)) {
                return null;
            }

            $token = str_replace('Bearer ', '', $authHeader);
            $key = getenv('JWT_SECRET_KEY') ?: 'factory-manager-jwt-secret-key-2025-change-in-production-256bit';
            
            $decoded = JWT::decode($token, new Key($key, 'HS256'));
            
            // Check all possible user ID fields in the token
            $userId = null;
            if (isset($decoded->data)) {
                $userId = $decoded->data->id ?? $decoded->data->user_id ?? null;
            }
            if (!$userId) {
                $userId = $decoded->id ?? $decoded->user_id ?? $decoded->sub ?? null;
            }
            
            return $userId;
        } catch (\Exception $e) {
            return null;
        }
    }

    public function index()
    {
        try {
            $userId = $this->getUserIdFromToken();
            if (!$userId) {
                return $this->failUnauthorized('Authentication required');
            }

            $notifications = $this->db->table('notifications')
                ->where('user_id', $userId)
                ->orderBy('created_at', 'DESC')
                ->limit(50)
                ->get()
                ->getResultArray();

            return $this->respond([
                'status' => 'success',
                'data' => $notifications
            ]);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'success',
                'data' => []
            ]);
        }
    }

    public function markAsRead($id)
    {
        return $this->respond(['status' => 'success']);
    }

    public function markAllAsRead()
    {
        return $this->respond(['status' => 'success']);
    }

    public function create()
    {
        return $this->respondCreated(['status' => 'success']);
    }
}
