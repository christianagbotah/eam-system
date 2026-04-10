<?php

namespace App\Controllers;

use App\Models\PmScheduleModel;
use App\Models\PmScheduleTrackingModel;

class PMDebug extends BaseController
{
    public function checkSchedules()
    {
        $scheduleModel = new PmScheduleModel();
        $trackingModel = new PmScheduleTrackingModel();
        
        $allSchedules = $scheduleModel->findAll();
        $allTracking = $trackingModel->findAll();
        
        $schedulesWithoutTracking = [];
        foreach ($allSchedules as $schedule) {
            $hasTracking = $trackingModel->where('schedule_id', $schedule['schedule_id'])->first();
            if (!$hasTracking) {
                $schedulesWithoutTracking[] = $schedule;
            }
        }
        
        $dueSchedules = $trackingModel->getDueSchedules();
        
        return $this->response->setJSON([
            'total_schedules' => count($allSchedules),
            'total_tracking' => count($allTracking),
            'schedules_without_tracking' => count($schedulesWithoutTracking),
            'schedules_without_tracking_list' => $schedulesWithoutTracking,
            'due_schedules_count' => count($dueSchedules),
            'due_schedules' => $dueSchedules,
            'message' => count($schedulesWithoutTracking) > 0 
                ? 'Run /pm-setup/initialize to create tracking for ' . count($schedulesWithoutTracking) . ' schedules'
                : 'All schedules have tracking initialized'
        ]);
    }
}
