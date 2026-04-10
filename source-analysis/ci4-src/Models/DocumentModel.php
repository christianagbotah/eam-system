<?php

namespace App\Models;

use CodeIgniter\Model;

class DocumentModel extends Model
{
    protected $table = 'documents';
    protected $primaryKey = 'id';
    protected $allowedFields = ['title', 'category', 'version', 'status', 'file_name', 'file_path', 'file_size', 'file_type', 'asset_id', 'uploaded_by', 'approved_by', 'approved_at', 'tags', 'metadata'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    
    protected $casts = [
        'tags' => 'json',
        'metadata' => 'json'
    ];
}
