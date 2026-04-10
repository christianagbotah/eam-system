<?php

namespace App\Services;

class AssignmentService
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function assignEquipment($data)
    {
        $this->db->table('machine_assignments')->insert($data);
        return $this->db->insertID();
    }

    public function getAssignments($params)
    {
        $builder = $this->db->table('machine_assignments ma')
            ->select('ma.*, au.asset_name as equipment_name, u.username as operator_name, og.name as group_name')
            ->join('assets_unified au', 'au.id = ma.asset_id', 'left')
            ->join('users u', 'u.id = ma.assignee_user_id', 'left')
            ->join('operator_groups og', 'og.id = ma.assignee_group_id', 'left');
        
        if (isset($params['asset_id'])) {
            $builder->where('ma.asset_id', $params['asset_id']);
        }
        
        if (isset($params['user_id'])) {
            $builder->groupStart()
                ->where('ma.assignee_user_id', $params['user_id'])
                ->orWhereIn('ma.assignee_group_id', function($builder) use ($params) {
                    return $builder->select('group_id')
                        ->from('operator_group_members')
                        ->where('user_id', $params['user_id']);
                })
                ->groupEnd();
        }
        
        if (!isset($params['include_ended'])) {
            $builder->where('ma.end_at IS NULL');
        }
        
        return ['status' => 'success', 'data' => $builder->get()->getResultArray()];
    }

    public function getAssignment($id)
    {
        $assignment = $this->db->table('machine_assignments ma')
            ->select('ma.*, au.asset_name as equipment_name, u.username as operator_name, og.name as group_name')
            ->join('assets_unified au', 'au.id = ma.asset_id', 'left')
            ->join('users u', 'u.id = ma.assignee_user_id', 'left')
            ->join('operator_groups og', 'og.id = ma.assignee_group_id', 'left')
            ->where('ma.id', $id)
            ->get()->getRowArray();
        
        return ['status' => 'success', 'data' => $assignment];
    }

    public function updateAssignment($id, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');
        $this->db->table('machine_assignments')->where('id', $id)->update($data);
        return ['status' => 'success', 'message' => 'Assignment updated'];
    }

    public function endAssignment($id)
    {
        return $this->db->table('machine_assignments')
            ->where('id', $id)
            ->update(['end_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')]);
    }

    public function getActiveAssignees($assetId)
    {
        $assignments = $this->db->table('machine_assignments ma')
            ->select('ma.*, u.username as operator_name, og.name as group_name')
            ->join('users u', 'u.id = ma.assignee_user_id', 'left')
            ->join('operator_groups og', 'og.id = ma.assignee_group_id', 'left')
            ->where('ma.asset_id', $assetId)
            ->where('ma.end_at IS NULL')
            ->get()->getResultArray();
        
        $assignees = [];
        foreach ($assignments as $a) {
            if ($a['assignee_user_id']) {
                $assignees[] = ['type' => 'user', 'id' => $a['assignee_user_id'], 'name' => $a['operator_name']];
            } elseif ($a['assignee_group_id']) {
                $members = $this->db->table('operator_group_members ogm')
                    ->select('ogm.user_id, u.username')
                    ->join('users u', 'u.id = ogm.user_id')
                    ->where('ogm.group_id', $a['assignee_group_id'])
                    ->get()->getResultArray();
                foreach ($members as $m) {
                    $assignees[] = ['type' => 'group_member', 'id' => $m['user_id'], 'name' => $m['username'], 'group' => $a['group_name']];
                }
            }
        }
        
        return ['status' => 'success', 'data' => $assignees];
    }
}
