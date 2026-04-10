<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderCommentModel extends Model
{
    protected $table = 'work_order_comments';
    protected $primaryKey = 'id';
    protected $allowedFields = ['work_order_id', 'user_id', 'comment'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
}
