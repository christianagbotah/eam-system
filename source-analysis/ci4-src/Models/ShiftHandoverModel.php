<?php

namespace App\Models;

use CodeIgniter\Model;

class ShiftHandoverModel extends Model
{
    protected $table = 'shift_handovers';
    protected $primaryKey = 'id';
    protected $allowedFields = ['shift_from', 'shift_to', 'handover_date', 'outgoing_supervisor', 'incoming_supervisor', 'production_summary', 'issues', 'pending_tasks', 'status'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
