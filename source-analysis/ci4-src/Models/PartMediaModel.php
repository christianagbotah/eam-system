<?php

namespace App\Models;

use CodeIgniter\Model;

class PartMediaModel extends Model
{
    protected $table = 'part_media';
    protected $primaryKey = 'id';
    protected $allowedFields = ['part_id', 'media_type', 'file_path', 'thumbnail_path', 'hotspot_data'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = false;
    
    protected $validationRules = [
        'part_id' => 'required|is_natural_no_zero',
        'media_type' => 'required|in_list[image,diagram,3d_model,document]',
        'file_path' => 'required'
    ];
}
