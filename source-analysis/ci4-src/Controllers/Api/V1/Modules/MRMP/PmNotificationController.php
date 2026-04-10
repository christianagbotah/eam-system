<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseResourceController;

class PmNotificationController extends BaseResourceController
{
    protected $format = 'json';

    public function index()
    {
        $role = $this->request->getGet('role');
        $userId = $this->request->getGet('user_id');
        
        $db = \Config\Database::connect();
        $builder = $db->table('pm_notifications')
            ->orderBy('created_at', 'DESC')
            ->limit(50);
        
        if ($role) {
            $builder->where('recipient_role', $role);
        }
        
        if ($userId) {
            $builder->groupStart()
                ->where('recipient_user_id', $userId)
                ->orWhere('recipient_user_id', null)
            ->groupEnd();
        }
        
        $notifications = $builder->get()->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $notifications
        ]);
    }

    public function markAsRead($id)
    {
        $db = \Config\Database::connect();
        $db->table('pm_notifications')
            ->where('id', $id)
            ->update([
                'is_read' => true,
                'read_at' => date('Y-m-d H:i:s')
            ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Notification marked as read'
        ]);
    }
}
