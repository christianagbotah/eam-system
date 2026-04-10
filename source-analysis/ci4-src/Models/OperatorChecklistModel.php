<?php
namespace App\Models;

use CodeIgniter\Model;

class OperatorChecklistModel extends Model {
    protected $table = 'operator_checklists';
    protected $primaryKey = 'id';
    protected $allowedFields = ['template_id', 'checklist_code', 'machine_id', 'operator_id', 'date', 'shift', 'items', 'score', 'max_score', 'pass_percentage', 'failed_items', 'comments', 'corrective_actions', 'attachments', 'signature', 'gps_location', 'status', 'reviewed_by', 'reviewed_at'];
    protected $useTimestamps = true;
}
