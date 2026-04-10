<?php
namespace App\Models;

use CodeIgniter\Model;

class SurveyScheduleModel extends Model {
    protected $table = 'survey_schedules';
    protected $primaryKey = 'schedule_id';
    protected $allowedFields = ['schedule_name', 'template_id', 'machine_id', 'shift_id', 'frequency', 'frequency_value', 'start_date', 'end_date', 'auto_create', 'auto_assign_user_id', 'reminder_hours', 'is_active', 'last_generated_at', 'next_generation_at'];
    protected $useTimestamps = false;
}
