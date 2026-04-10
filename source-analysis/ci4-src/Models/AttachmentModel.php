<?php

namespace App\Models;

use CodeIgniter\Model;

class AttachmentModel extends Model
{
    protected $table = 'attachments';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'entity_type',
        'entity_id',
        'file_name',
        'file_path',
        'file_size',
        'mime_type',
        'user_id'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
