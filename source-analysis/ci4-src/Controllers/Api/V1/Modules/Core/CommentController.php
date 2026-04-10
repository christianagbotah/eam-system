<?php

namespace App\Controllers\Api\V1\Modules\Core;

use App\Controllers\BaseController;
use App\Models\MaintenanceCommentModel;

class CommentController extends BaseController
{
    protected $commentModel;

    public function __construct()
    {
        $this->commentModel = new MaintenanceCommentModel();
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $data['user_id'] = $data['user_id'] ?? 1; // Get from JWT

        if (!$this->commentModel->insert($data)) {
            return $this->fail($this->commentModel->errors());
        }

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Comment added',
            'data' => ['id' => $this->commentModel->getInsertID()]
        ]);
    }

    public function getByEntity($entityType, $entityId)
    {
        $comments = $this->commentModel->getByEntity($entityType, $entityId);
        return $this->respond(['status' => 'success', 'data' => $comments]);
    }
}
