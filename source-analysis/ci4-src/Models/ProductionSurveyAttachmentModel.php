<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductionSurveyAttachmentModel extends Model
{
    protected $table = 'production_survey_attachments';
    protected $primaryKey = 'id';
    protected $allowedFields = ['survey_id', 'file_path', 'thumbnail_path', 'file_type', 'file_size'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
}
