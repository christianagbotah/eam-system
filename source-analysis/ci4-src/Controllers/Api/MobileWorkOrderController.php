<?php

namespace App\Controllers\API;

use CodeIgniter\RESTful\ResourceController;

class MobileWorkOrderController extends ResourceController
{
    protected $format = 'json';

    public function myWorkOrders()
    {
        $techId = $this->request->getGet('technician_id');
        $db = \Config\Database::connect();
        
        $query = $db->query("
            SELECT mwo.*, wo.title, wo.priority, wo.asset_id, a.name as asset_name
            FROM mobile_work_orders mwo
            JOIN work_orders wo ON mwo.work_order_id = wo.id
            LEFT JOIN assets a ON wo.asset_id = a.id
            WHERE mwo.technician_id = ?
            ORDER BY wo.priority DESC, mwo.created_at DESC
        ", [$techId]);
        
        return $this->respond(['data' => $query->getResultArray()]);
    }

    public function startWork()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $db->query("
            UPDATE mobile_work_orders 
            SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
            WHERE id = ?
        ", [$data['mobile_wo_id']]);
        
        return $this->respond(['message' => 'Work started']);
    }

    public function completeWork()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $db->query("
            UPDATE mobile_work_orders 
            SET status = 'completed', completed_at = NOW(), 
                actual_hours = ?, completion_notes = ?, signature_data = ?, updated_at = NOW()
            WHERE id = ?
        ", [$data['actual_hours'], $data['notes'], $data['signature'] ?? null, $data['mobile_wo_id']]);
        
        return $this->respond(['message' => 'Work completed']);
    }

    public function uploadPhoto()
    {
        $file = $this->request->getFile('photo');
        $mwoId = $this->request->getPost('mobile_wo_id');
        $type = $this->request->getPost('type');
        
        if ($file->isValid()) {
            $newName = $file->getRandomName();
            $file->move(WRITEPATH . 'uploads/mobile_wo', $newName);
            
            $db = \Config\Database::connect();
            $db->query("
                INSERT INTO mobile_wo_photos (mobile_wo_id, photo_type, file_path, uploaded_at)
                VALUES (?, ?, ?, NOW())
            ", [$mwoId, $type, $newName]);
            
            return $this->respond(['message' => 'Photo uploaded', 'file' => $newName]);
        }
        
        return $this->fail('Upload failed');
    }

    public function logTime()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $db->query("
            INSERT INTO mobile_wo_time_logs (mobile_wo_id, technician_id, clock_in, clock_out, duration_minutes, activity_type, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ", [$data['mobile_wo_id'], $data['technician_id'], $data['clock_in'], $data['clock_out'] ?? null, 
            $data['duration'] ?? null, $data['activity_type'], $data['notes'] ?? null]);
        
        return $this->respond(['message' => 'Time logged']);
    }

    public function recordPartUsage()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $db->query("
            INSERT INTO mobile_wo_parts_used (mobile_wo_id, part_id, quantity_used, scanned_barcode, used_at)
            VALUES (?, ?, ?, ?, NOW())
        ", [$data['mobile_wo_id'], $data['part_id'], $data['quantity'], $data['barcode'] ?? null]);
        
        return $this->respond(['message' => 'Part usage recorded']);
    }

    public function syncOfflineData()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        foreach ($data['queue'] as $item) {
            $db->query("
                INSERT INTO mobile_sync_queue (technician_id, data_type, data_payload, sync_status, created_at)
                VALUES (?, ?, ?, 'synced', NOW())
            ", [$item['technician_id'], $item['type'], json_encode($item['data'])]);
        }
        
        return $this->respond(['message' => 'Data synced', 'count' => count($data['queue'])]);
    }

    public function getWorkOrderDetails($id)
    {
        $db = \Config\Database::connect();
        
        $wo = $db->query("
            SELECT mwo.*, wo.*, a.name as asset_name
            FROM mobile_work_orders mwo
            JOIN work_orders wo ON mwo.work_order_id = wo.id
            LEFT JOIN assets a ON wo.asset_id = a.id
            WHERE mwo.id = ?
        ", [$id])->getRowArray();
        
        $photos = $db->query("SELECT * FROM mobile_wo_photos WHERE mobile_wo_id = ?", [$id])->getResultArray();
        $timeLogs = $db->query("SELECT * FROM mobile_wo_time_logs WHERE mobile_wo_id = ?", [$id])->getResultArray();
        $parts = $db->query("SELECT * FROM mobile_wo_parts_used WHERE mobile_wo_id = ?", [$id])->getResultArray();
        
        return $this->respond([
            'work_order' => $wo,
            'photos' => $photos,
            'time_logs' => $timeLogs,
            'parts_used' => $parts
        ]);
    }
}
