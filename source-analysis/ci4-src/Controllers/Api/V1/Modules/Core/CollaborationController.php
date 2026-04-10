<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class CollaborationController extends ResourceController
{
    protected $format = 'json';

    public function getComments($workOrderId = null)
    {
        $db = \Config\Database::connect();
        
        $query = "SELECT 
            c.*,
            u.username
        FROM work_order_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.work_order_id = ?
        ORDER BY c.created_at DESC";
        
        $comments = $db->query($query, [$workOrderId])->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $comments]);
    }

    public function addComment($workOrderId = null)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $db->table('work_order_comments')->insert([
            'work_order_id' => $workOrderId,
            'user_id' => 1,
            'comment' => $data['comment']
        ]);
        
        return $this->respondCreated(['status' => 'success', 'message' => 'Comment added']);
    }
}
