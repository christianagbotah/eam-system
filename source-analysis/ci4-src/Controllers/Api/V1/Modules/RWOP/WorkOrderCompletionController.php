<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;

class WorkOrderCompletionController extends BaseApiController
{
    public function getTimeLogs($id = null)
    {
        $db = \Config\Database::connect();
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        // Get completed logs with start/complete pairs
        $logs = $db->query("
            SELECT 
                complete.id,
                complete.work_order_id,
                complete.technician_id,
                complete.log_type,
                start.timestamp as start_time,
                complete.timestamp as end_time,
                complete.duration_minutes,
                users.username as technician_name,
                'completed' as status
            FROM work_order_time_logs complete
            LEFT JOIN work_order_time_logs start ON 
                start.work_order_id = complete.work_order_id AND
                start.technician_id = complete.technician_id AND
                start.log_type = 'start' AND
                start.id < complete.id
            LEFT JOIN users ON users.id = complete.technician_id
            WHERE complete.work_order_id = ? AND complete.log_type = 'complete'
            ORDER BY complete.id DESC
        ", [$id])->getResultArray();
        
        // Check for active or paused timer for current user
        $lastLog = $db->table('work_order_time_logs')
            ->where('work_order_id', $id)
            ->where('technician_id', $userId)
            ->orderBy('id', 'DESC')
            ->get()
            ->getRowArray();
        
        // If last log is 'start' or 'resume', timer is active
        // If last log is 'pause', timer is paused
        if ($lastLog && in_array($lastLog['log_type'], ['start', 'resume', 'pause'])) {
            // Find the start log
            $startLog = $db->table('work_order_time_logs')
                ->where('work_order_id', $id)
                ->where('technician_id', $userId)
                ->where('log_type', 'start')
                ->orderBy('id', 'DESC')
                ->get()
                ->getRowArray();
            
            if ($startLog) {
                $user = $db->table('users')->where('id', $userId)->get()->getRowArray();
                $activeLog = [
                    'id' => $startLog['id'],
                    'work_order_id' => $id,
                    'technician_id' => $userId,
                    'log_type' => $lastLog['log_type'],
                    'clock_in' => $startLog['timestamp'],
                    'start_time' => $startLog['timestamp'],
                    'pause_time' => $lastLog['log_type'] === 'pause' ? $lastLog['timestamp'] : null,
                    'technician_name' => $user['username'] ?? 'Unknown',
                    'status' => $lastLog['log_type'] === 'pause' ? 'paused' : 'active'
                ];
                // Add active/paused log at the beginning
                array_unshift($logs, $activeLog);
            }
        }
        
        return $this->respond([
            'status' => 'success',
            'data' => ['logs' => $logs]
        ]);
    }
    
    public function getTimeLogsSummary($id = null)
    {
        $db = \Config\Database::connect();
        $summary = $db->query("
            SELECT 
                COUNT(DISTINCT CASE WHEN log_type = 'start' THEN id END) as total_sessions,
                SUM(CASE WHEN log_type = 'complete' THEN duration_minutes ELSE 0 END) / 60 as total_hours,
                0 as total_break_minutes
            FROM work_order_time_logs
            WHERE work_order_id = ?
        ", [$id])->getRowArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $summary
        ]);
    }
    
    public function pauseTimeLog($id = null)
    {
        $db = \Config\Database::connect();
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        $db->table('work_order_time_logs')->insert([
            'work_order_id' => $id,
            'technician_id' => $userId,
            'log_type' => 'pause',
            'timestamp' => date('Y-m-d H:i:s'),
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Time log paused'
        ]);
    }
    
    public function resumeTimeLog($id = null)
    {
        $db = \Config\Database::connect();
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        $db->table('work_order_time_logs')->insert([
            'work_order_id' => $id,
            'technician_id' => $userId,
            'log_type' => 'resume',
            'timestamp' => date('Y-m-d H:i:s'),
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Time log resumed'
        ]);
    }
    
    public function createManualTimeLog($id = null)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $db->table('work_order_time_logs')->insert([
            'work_order_id' => $id,
            'technician_id' => $data['technician_id'],
            'log_type' => 'complete',
            'timestamp' => $data['clock_out'],
            'duration_minutes' => round($data['actual_hours'] * 60),
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Time log created'
        ]);
    }
    
    public function startTimeLog($id = null)
    {
        $db = \Config\Database::connect();
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        // Check if there's already an active time log (start without complete)
        $lastLog = $db->table('work_order_time_logs')
            ->where('work_order_id', $id)
            ->where('technician_id', $userId)
            ->orderBy('id', 'DESC')
            ->get()
            ->getRowArray();
        
        if ($lastLog && $lastLog['log_type'] === 'start') {
            return $this->respond([
                'status' => 'error',
                'message' => 'You already have an active time log for this work order'
            ]);
        }
        
        // Create new time log
        $db->table('work_order_time_logs')->insert([
            'work_order_id' => $id,
            'technician_id' => $userId,
            'log_type' => 'start',
            'timestamp' => date('Y-m-d H:i:s'),
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        // Update work order status to in_progress
        $db->table('work_orders')->where('id', $id)->update([
            'status' => 'in_progress',
            'actual_start' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Time log started',
            'data' => ['id' => $db->insertID()]
        ]);
    }
    
    public function stopTimeLog($id = null)
    {
        $db = \Config\Database::connect();
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        // Find last start log
        $startLog = $db->table('work_order_time_logs')
            ->where('work_order_id', $id)
            ->where('technician_id', $userId)
            ->where('log_type', 'start')
            ->orderBy('id', 'DESC')
            ->get()
            ->getRowArray();
        
        if (!$startLog) {
            return $this->respond([
                'status' => 'error',
                'message' => 'No active time log found'
            ]);
        }
        
        // Calculate duration
        $startTime = strtotime($startLog['timestamp']);
        $endTime = time();
        $durationMinutes = ($endTime - $startTime) / 60;
        
        // Create complete log
        $db->table('work_order_time_logs')->insert([
            'work_order_id' => $id,
            'technician_id' => $userId,
            'log_type' => 'complete',
            'timestamp' => date('Y-m-d H:i:s'),
            'duration_minutes' => round($durationMinutes),
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Time log stopped',
            'data' => ['hours_worked' => round($durationMinutes / 60, 2)]
        ]);
    }
    
    public function getMaterialsUsed($id = null)
    {
        $db = \Config\Database::connect();
        $materials = $db->table('work_order_materials_used')
            ->select('work_order_materials_used.*, parts.part_name, parts.part_number')
            ->join('parts', 'parts.id = work_order_materials_used.part_id', 'left')
            ->where('work_order_id', $id)
            ->get()
            ->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $materials
        ]);
    }
    
    public function addMaterialUsed($id = null)
    {
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        $db->table('work_order_materials_used')->insert([
            'work_order_id' => $id,
            'part_id' => $data['part_id'],
            'quantity_used' => $data['quantity_used'],
            'technician_id' => $userId,
            'notes' => $data['notes'] ?? null,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Material added',
            'data' => ['id' => $db->insertID()]
        ]);
    }
    
    public function getPlannedMaterials($id = null)
    {
        $db = \Config\Database::connect();
        $materials = $db->table('work_order_materials')
            ->select('work_order_materials.*, parts.part_name, parts.part_number')
            ->join('parts', 'parts.id = work_order_materials.part_id', 'left')
            ->where('work_order_id', $id)
            ->get()
            ->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $materials
        ]);
    }
    
    public function uploadAttachment($id = null)
    {
        $file = $this->request->getFile('file');
        if (!$file || !$file->isValid()) {
            return $this->fail('No valid file uploaded');
        }
        
        $newName = $file->getRandomName();
        $file->move(WRITEPATH . 'uploads/work_orders', $newName);
        
        $db = \Config\Database::connect();
        $db->table('work_order_attachments')->insert([
            'work_order_id' => $id,
            'file_name' => $file->getClientName(),
            'file_path' => 'uploads/work_orders/' . $newName,
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $GLOBALS['jwt_user_data']->user_id ?? 1,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'File uploaded',
            'data' => ['id' => $db->insertID(), 'file_name' => $file->getClientName()]
        ]);
    }
    
    public function getAttachments($id = null)
    {
        $db = \Config\Database::connect();
        $attachments = $db->table('work_order_attachments')
            ->where('work_order_id', $id)
            ->get()
            ->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $attachments
        ]);
    }
    
    public function deleteAttachment($id = null)
    {
        $db = \Config\Database::connect();
        $attachment = $db->table('work_order_attachments')->where('id', $id)->get()->getRowArray();
        
        if ($attachment && file_exists(WRITEPATH . $attachment['file_path'])) {
            unlink(WRITEPATH . $attachment['file_path']);
        }
        
        $db->table('work_order_attachments')->where('id', $id)->delete();
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Attachment deleted'
        ]);
    }
    
    public function getCompletionReport($id = null)
    {
        $db = \Config\Database::connect();
        $report = $db->table('work_order_completion_reports')
            ->where('work_order_id', $id)
            ->get()
            ->getRowArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $report
        ]);
    }
    
    public function saveCompletionReport($id = null)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $existing = $db->table('work_order_completion_reports')
            ->where('work_order_id', $id)
            ->get()
            ->getRowArray();
        
        $reportData = [
            'work_order_id' => $id,
            'work_performed' => $data['work_performed'] ?? '',
            'findings' => json_encode([
                'root_cause' => $data['root_cause'] ?? '',
                'observations' => $data['observations'] ?? '',
                'quality_check_passed' => $data['quality_check_passed'] ?? true,
                'quality_notes' => $data['quality_notes'] ?? ''
            ]),
            'recommendations' => json_encode([
                'corrective_actions' => $data['corrective_actions'] ?? '',
                'recommendations' => $data['recommendations'] ?? ''
            ])
        ];
        
        if ($existing) {
            $db->table('work_order_completion_reports')
                ->where('work_order_id', $id)
                ->update($reportData);
        } else {
            $reportData['created_at'] = date('Y-m-d H:i:s');
            $db->table('work_order_completion_reports')->insert($reportData);
        }
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Report saved'
        ]);
    }
}
