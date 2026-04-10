<?php

namespace App\Controllers;

class PMCheck extends BaseController
{
    public function index()
    {
        $db = db_connect();
        
        $data = [
            'equipment_count' => $db->table('equipment')->countAll(),
            'parts_count' => $db->table('parts')->countAll(),
            'pm_tasks_count' => $db->table('pm_tasks')->countAll(),
            'pm_part_tasks_count' => $db->table('pm_part_tasks')->where('is_active', 1)->countAllResults(false),
            'pm_schedules_count' => $db->table('pm_schedules')->countAll(),
        ];
        
        return view('maintenance/pm_check', $data);
    }
}
