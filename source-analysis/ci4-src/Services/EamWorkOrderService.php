<?php

namespace App\Services;

use App\Repositories\EamWorkOrderRepository;
use App\Traits\PlantScopeTrait;

class EamWorkOrderService
{
    use PlantScopeTrait;
    
    protected $repo;

    public function __construct()
    {
        $this->repo = new EamWorkOrderRepository();
    }

    public function getAll($params)
    {
        // Handle assigned_to=me parameter
        if (isset($params['assigned_to']) && $params['assigned_to'] === 'me') {
            $userData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = $userData->user_id ?? $userData->id ?? null;
            if ($userId) {
                $params['assigned_to'] = $userId;
            } else {
                unset($params['assigned_to']);
            }
        }
        
        return $this->repo->paginate($params['page'] ?? 1, $params['limit'] ?? 20, $params['search'] ?? '', $params);
    }

    public function getById($id)
    {
        $data = $this->repo->find($id);
        if (!$data) {
            return ['status' => 'error', 'message' => 'Not found'];
        }
        
        $db = \Config\Database::connect();
        
        // Load asset details
        if (!empty($data['asset_id'])) {
            $asset = $db->table('assets_unified')->where('id', $data['asset_id'])->get()->getRowArray();
            if ($asset) {
                $data['asset_name'] = $asset['asset_name'] ?? $asset['name'] ?? null;
                // Get location from area or facility
                if (!empty($asset['area_id'])) {
                    $area = $db->table('areas')->select('area_name')->where('id', $asset['area_id'])->get()->getRowArray();
                    $data['asset_location'] = $area['area_name'] ?? null;
                } elseif (!empty($asset['facility_id'])) {
                    $facility = $db->table('facilities')->select('facility_name')->where('id', $asset['facility_id'])->get()->getRowArray();
                    $data['asset_location'] = $facility['facility_name'] ?? null;
                }
            }
        }
        
        // Load department name
        if (!empty($data['department_id'])) {
            $dept = $db->table('departments')->select('department_name')->where('id', $data['department_id'])->get()->getRowArray();
            $data['department_name'] = $dept['department_name'] ?? null;
        }
        
        // Load team leader name
        if (!empty($data['team_leader_id'])) {
            $leader = $db->table('users')->select('username')->where('id', $data['team_leader_id'])->get()->getRowArray();
            $data['team_leader_name'] = $leader['username'] ?? null;
        }
        
        // Load location from request if not in work order
        if (empty($data['location']) && !empty($data['request_id'])) {
            $request = $db->table('maintenance_requests')->select('location')->where('id', $data['request_id'])->get()->getRowArray();
            $data['location'] = $request['location'] ?? null;
        }
        
        // Load team members
        $data['team_members'] = $db->table('work_order_team_members')
            ->select('work_order_team_members.*, users.username as name, technician_skills.skill_name')
            ->join('users', 'users.id = work_order_team_members.technician_id', 'left')
            ->join('technician_skills', 'technician_skills.technician_id = work_order_team_members.technician_id', 'left')
            ->where('work_order_id', $id)
            ->get()->getResultArray();
        
        // Load required parts
        $data['required_parts'] = $db->table('work_order_materials')
            ->select('work_order_materials.*, parts.part_name, parts.part_number')
            ->join('parts', 'parts.id = work_order_materials.part_id', 'left')
            ->where('work_order_id', $id)
            ->get()->getResultArray();
        
        // Load required tools
        $data['required_tools'] = $db->table('tool_assignments')
            ->select('tool_assignments.*, tools.tool_name, tools.category')
            ->join('tools', 'tools.id = tool_assignments.tool_id', 'left')
            ->where('work_order_id', $id)
            ->get()->getResultArray();
        
        // Calculate actual hours from time logs
        $totalMinutes = $db->query("
            SELECT SUM(duration_minutes) as total_minutes
            FROM work_order_time_logs
            WHERE work_order_id = ? AND log_type = 'complete'
        ", [$id])->getRowArray();
        
        $data['actual_hours'] = $totalMinutes['total_minutes'] ? round($totalMinutes['total_minutes'] / 60, 2) : 0;
        
        // Get time logs by technician
        $timeLogs = $db->query("
            SELECT 
                complete.technician_id,
                users.username as technician_name,
                start.timestamp as start_time,
                complete.timestamp as end_time,
                complete.duration_minutes,
                ROUND(complete.duration_minutes / 60, 2) as hours
            FROM work_order_time_logs complete
            LEFT JOIN work_order_time_logs start ON 
                start.work_order_id = complete.work_order_id AND
                start.technician_id = complete.technician_id AND
                start.log_type = 'start' AND
                start.id < complete.id AND
                NOT EXISTS (
                    SELECT 1 FROM work_order_time_logs mid
                    WHERE mid.work_order_id = complete.work_order_id
                    AND mid.technician_id = complete.technician_id
                    AND mid.log_type = 'complete'
                    AND mid.id > start.id AND mid.id < complete.id
                )
            LEFT JOIN users ON users.id = complete.technician_id
            WHERE complete.work_order_id = ? AND complete.log_type = 'complete'
            ORDER BY complete.timestamp DESC
        ", [$id])->getResultArray();
        
        $data['time_logs'] = $timeLogs;
        
        return ['status' => 'success', 'data' => $data];
    }

    public function create($data)
    {
        $data['wo_number'] = $this->generateWorkOrderNumber();
        $data['status'] = $data['status'] ?? 'draft';
        $data['plant_id'] = $data['plant_id'] ?? $this->getPlantId();
        $id = $this->repo->create($data);
        return $id ? ['status' => 'success', 'data' => ['id' => $id]] : ['status' => 'error', 'message' => 'Creation failed'];
    }

    public function update($id, $data)
    {
        $db = \Config\Database::connect();
        
        // Extract related data
        $technicians = $data['technicians'] ?? null;
        $parts = $data['required_parts'] ?? null;
        $tools = $data['required_tools'] ?? null;
        $teamLeaderId = $data['team_leader_id'] ?? null;
        
        // Remove from main data array
        unset($data['technicians'], $data['required_parts'], $data['required_tools'], $data['team_members']);
        
        // Update main work order
        $result = $this->repo->update($id, $data);
        
        if ($result) {
            // Update team members if provided
            if ($technicians !== null) {
                $db->table('work_order_team_members')->where('work_order_id', $id)->delete();
                if (is_array($technicians) && count($technicians) > 0) {
                    foreach ($technicians as $tech) {
                        $db->table('work_order_team_members')->insert([
                            'work_order_id' => $id,
                            'technician_id' => $tech['technician_id'] ?? $tech['id'],
                            'role' => $tech['role'] ?? 'member',
                            'created_at' => date('Y-m-d H:i:s')
                        ]);
                    }
                }
            }
            
            // Update parts if provided
            if ($parts !== null) {
                $db->table('work_order_materials')->where('work_order_id', $id)->delete();
                if (is_array($parts) && count($parts) > 0) {
                    foreach ($parts as $part) {
                        $db->table('work_order_materials')->insert([
                            'work_order_id' => $id,
                            'inventory_item_id' => $part['part_id'] ?? 0,
                            'part_id' => $part['part_id'] ?? $part['id'],
                            'quantity_required' => $part['quantity'] ?? 1,
                            'created_at' => date('Y-m-d H:i:s')
                        ]);
                    }
                }
            }
            
            // Update tools if provided
            if ($tools !== null) {
                $db->table('tool_assignments')->where('work_order_id', $id)->delete();
                if (is_array($tools) && count($tools) > 0) {
                    foreach ($tools as $tool) {
                        $db->table('tool_assignments')->insert([
                            'tool_id' => $tool['tool_id'] ?? $tool['id'],
                            'work_order_id' => $id,
                            'quantity' => $tool['quantity'] ?? 1,
                            'created_at' => date('Y-m-d H:i:s')
                        ]);
                    }
                }
            }
            
            // Update team leader if provided
            if ($teamLeaderId !== null) {
                $this->repo->update($id, ['team_leader_id' => $teamLeaderId]);
            }
        }
        
        return $result ? ['status' => 'success', 'message' => 'Updated'] : ['status' => 'error', 'message' => 'Update failed'];
    }

    public function delete($id)
    {
        $result = $this->repo->delete($id);
        return $result ? ['status' => 'success', 'message' => 'Deleted'] : ['status' => 'error', 'message' => 'Delete failed'];
    }

    public function assign($id, $data)
    {
        $result = $this->repo->update($id, [
            'assigned_to' => $data['user_id'] ?? $data['assigned_to'],
            'status' => 'assigned'
        ]);
        return $result ? ['status' => 'success', 'message' => 'Assigned'] : ['status' => 'error', 'message' => 'Assignment failed'];
    }

    public function complete($id, $data)
    {
        $result = $this->repo->update($id, [
            'status' => 'completed',
            'actual_end' => date('Y-m-d H:i:s'),
            'completion_notes' => $data['notes'] ?? ''
        ]);
        return $result ? ['status' => 'success', 'message' => 'Completed'] : ['status' => 'error', 'message' => 'Completion failed'];
    }

    public function issueMaterials($id, $data)
    {
        // Implement material issuing logic
        return ['status' => 'success', 'message' => 'Materials issued'];
    }

    public function start($id, $data)
    {
        $result = $this->repo->update($id, [
            'status' => 'in_progress',
            'actual_start' => date('Y-m-d H:i:s')
        ]);
        return $result ? ['status' => 'success', 'message' => 'Started'] : ['status' => 'error', 'message' => 'Start failed'];
    }

    public function getDashboardStats()
    {
        return $this->repo->getDashboardStats();
    }

    private function generateWorkOrderNumber()
    {
        $prefix = 'WO';
        $year = date('Y');
        $month = date('m');
        $count = $this->repo->countByMonth($year, $month);
        return sprintf('%s-%s%s-%04d', $prefix, $year, $month, $count + 1);
    }
}
