<?php

namespace App\Services;

class OperatorGroupService
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function getAll()
    {
        $groups = $this->db->table('operator_groups')->get()->getResultArray();
        foreach ($groups as &$group) {
            $group['members'] = $this->db->table('operator_group_members ogm')
                ->select('ogm.*, u.username')
                ->join('users u', 'u.id = ogm.user_id')
                ->where('ogm.group_id', $group['id'])
                ->get()->getResultArray();
        }
        return ['status' => 'success', 'data' => $groups];
    }

    public function create($data)
    {
        $this->db->transStart();
        
        $this->db->table('operator_groups')->insert([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'created_by' => $data['created_by']
        ]);
        $groupId = $this->db->insertID();
        
        if (isset($data['user_ids']) && is_array($data['user_ids'])) {
            foreach ($data['user_ids'] as $userId) {
                $this->db->table('operator_group_members')->insert([
                    'group_id' => $groupId,
                    'user_id' => $userId
                ]);
            }
        }
        
        $this->db->transComplete();
        return ['status' => 'success', 'data' => ['id' => $groupId]];
    }

    public function delete($id)
    {
        $this->db->table('operator_groups')->where('id', $id)->delete();
        return ['status' => 'success'];
    }
}
