<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseResourceController;
use App\Models\TechnicianGroupModel;

/**
 * Enterprise-Grade Technician Group Controller
 * Manages technician groups with comprehensive validation and audit trails
 */
class TechnicianGroupController extends BaseResourceController
{
    protected $format = 'json';
    protected $modelName = 'App\Models\TechnicianGroupModel';

    public function index()
    {
        try {
            $model = new TechnicianGroupModel();
            $groups = $model->select('technician_groups.*, u.full_name as leader_name, d.department_name, 
                                     (SELECT COUNT(*) FROM technician_group_members WHERE group_id = technician_groups.id AND is_active = 1) as member_count')
                ->join('users u', 'u.id = technician_groups.group_leader_id')
                ->join('departments d', 'd.id = technician_groups.department_id', 'left')
                ->findAll();
            
            log_message('info', 'Technician groups retrieved by user: ' . $this->getUserId());
            
            return $this->respond([
                'status' => 'success',
                'data' => $groups,
                'total' => count($groups)
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Error retrieving technician groups: ' . $e->getMessage());
            return $this->failServerError('Failed to retrieve groups');
        }
    }

    public function show($id = null)
    {
        try {
            $model = new TechnicianGroupModel();
            $group = $model->getGroupWithMembers($id);
            
            if (!$group) {
                return $this->failNotFound('Group not found');
            }
            
            return $this->respond(['status' => 'success', 'data' => $group]);
        } catch (\Exception $e) {
            log_message('error', 'Error retrieving group: ' . $e->getMessage());
            return $this->failServerError('Failed to retrieve group');
        }
    }

    public function create()
    {
        try {
            $model = new TechnicianGroupModel();
            $data = $this->request->getJSON(true);

            if (!$this->validate($model->getValidationRules())) {
                return $this->failValidationErrors($this->validator->getErrors());
            }

            if ($model->insert($data)) {
                $groupId = $model->getInsertID();
                
                // Update group leader flag
                $this->updateUserGroupLeader($data['group_leader_id'], $groupId);
                
                log_message('info', "Group created: {$groupId} by user: " . $this->getUserId());
                
                return $this->respondCreated([
                    'status' => 'success',
                    'message' => 'Group created successfully',
                    'id' => $groupId
                ]);
            }

            return $this->fail($model->errors());
        } catch (\Exception $e) {
            log_message('error', 'Error creating group: ' . $e->getMessage());
            return $this->failServerError('Failed to create group');
        }
    }

    public function update($id = null)
    {
        try {
            $model = new TechnicianGroupModel();
            $data = $this->request->getJSON(true);

            if (!$model->find($id)) {
                return $this->failNotFound('Group not found');
            }

            if ($model->update($id, $data)) {
                log_message('info', "Group updated: {$id} by user: " . $this->getUserId());
                
                return $this->respond([
                    'status' => 'success',
                    'message' => 'Group updated successfully'
                ]);
            }

            return $this->fail($model->errors());
        } catch (\Exception $e) {
            log_message('error', 'Error updating group: ' . $e->getMessage());
            return $this->failServerError('Failed to update group');
        }
    }

    public function addMember($groupId)
    {
        try {
            $data = $this->request->getJSON(true);
            
            if (!isset($data['technician_id'])) {
                return $this->fail('Technician ID is required');
            }

            $db = \Config\Database::connect();
            
            // Check if already a member
            $existing = $db->table('technician_group_members')
                ->where(['group_id' => $groupId, 'technician_id' => $data['technician_id']])
                ->get()
                ->getRow();

            if ($existing) {
                if ($existing->is_active) {
                    return $this->fail('Technician is already a member');
                }
                // Reactivate
                $db->table('technician_group_members')
                    ->where(['group_id' => $groupId, 'technician_id' => $data['technician_id']])
                    ->update(['is_active' => 1, 'role' => $data['role'] ?? 'member']);
            } else {
                $db->table('technician_group_members')->insert([
                    'group_id' => $groupId,
                    'technician_id' => $data['technician_id'],
                    'role' => $data['role'] ?? 'member',
                    'is_active' => 1,
                    'joined_at' => date('Y-m-d H:i:s')
                ]);
            }

            // Update user's group_id
            $db->table('users')
                ->where('id', $data['technician_id'])
                ->update(['group_id' => $groupId]);
            
            log_message('info', "Member added to group {$groupId}: {$data['technician_id']}");
            
            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Member added successfully'
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Error adding member: ' . $e->getMessage());
            return $this->failServerError('Failed to add member');
        }
    }

    public function removeMember($groupId, $technicianId)
    {
        try {
            $db = \Config\Database::connect();
            
            $db->table('technician_group_members')
                ->where(['group_id' => $groupId, 'technician_id' => $technicianId])
                ->update(['is_active' => 0]);

            // Clear user's group_id
            $db->table('users')
                ->where('id', $technicianId)
                ->update(['group_id' => null]);
            
            log_message('info', "Member removed from group {$groupId}: {$technicianId}");
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Member removed successfully'
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Error removing member: ' . $e->getMessage());
            return $this->failServerError('Failed to remove member');
        }
    }

    private function updateUserGroupLeader($userId, $groupId)
    {
        $db = \Config\Database::connect();
        $db->table('users')
            ->where('id', $userId)
            ->update(['is_group_leader' => 1, 'group_id' => $groupId]);
    }

    private function getUserId()
    {
        $userData = \App\Filters\JWTAuthFilter::getUserData();
        return $userData->user_id ?? 1;
    }
}
