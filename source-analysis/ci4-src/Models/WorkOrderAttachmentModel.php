<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderAttachmentModel extends Model
{
    protected $table = 'work_order_attachments';
    protected $primaryKey = 'id';
    protected $allowedFields = ['work_order_id', 'file_name', 'file_path', 'file_type', 'file_size', 'uploaded_by'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
}
