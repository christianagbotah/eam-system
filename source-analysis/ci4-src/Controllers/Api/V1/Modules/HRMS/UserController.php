<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseResourceController;
use App\Models\UserModel;

class UserController extends BaseResourceController
{
    protected $format = 'json';

    public function index()
    {
        $model = new UserModel();
        $role = $this->request->getGet('role');
        $department = $this->request->getGet('department_id');
        
        $db = \Config\Database::connect();
        $builder = $db->table('users u')
            ->select('u.*, d.department_name, s.full_name as supervisor_name')
            ->join('departments d', 'd.id = u.department_id', 'left')
            ->join('users s', 's.id = u.supervisor_id', 'left');
        
        if ($role) {
            $builder->where('u.role', $role);
        }
        
        if ($department) {
            $builder->where('u.department_id', $department);
        }
        
        $users = $builder->get()->getResultArray();
        
        // Add skill information for all users based on their trade field
        foreach ($users as &$user) {
            if (!empty($user['trade'])) {
                // If trade is a skill ID, fetch the skill
                if (is_numeric($user['trade'])) {
                    $skill = $db->table('skills')
                        ->where('id', $user['trade'])
                        ->get()->getRowArray();
                    if ($skill) {
                        $user['skill_name'] = $skill['name'];
                        $user['skill_id'] = $skill['id'];
                    }
                } else {
                    // If trade is a skill name, fetch by name
                    $skill = $db->table('skills')
                        ->where('name', $user['trade'])
                        ->get()->getRowArray();
                    if ($skill) {
                        $user['skill_name'] = $skill['name'];
                        $user['skill_id'] = $skill['id'];
                    } else {
                        // Just use the trade value as skill name
                        $user['skill_name'] = $user['trade'];
                    }
                }
            }
        }
        
        return $this->respond([
            'status' => 'success',
            'data' => $users
        ]);
    }

    public function show($id = null)
    {
        $db = \Config\Database::connect();
        $user = $db->table('users u')
            ->select('u.*, d.department_name, s.full_name as supervisor_name')
            ->join('departments d', 'd.id = u.department_id', 'left')
            ->join('users s', 's.id = u.supervisor_id', 'left')
            ->where('u.id', $id)
            ->get()->getRowArray();
        
        if (!$user) {
            return $this->failNotFound('User not found');
        }
        
        return $this->respond([
            'status' => 'success',
            'data' => $user
        ]);
    }

    public function create()
    {
        $model = new UserModel();
        $data = $this->request->getJSON(true);
        
        // Generate full_name
        $data['full_name'] = trim(($data['first_name'] ?? '') . ' ' . ($data['middle_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
        
        // Hash password
        if (isset($data['password']) && !empty($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        
        // Set defaults
        $data['status'] = $data['status'] ?? 'active';
        $data['employment_status'] = $data['employment_status'] ?? 'active';
        
        if ($model->insert($data)) {
            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Employee created successfully',
                'data' => ['id' => $model->getInsertID()]
            ]);
        }
        
        return $this->fail($model->errors());
    }

    public function update($id = null)
    {
        $model = new UserModel();
        $user = $model->find($id);
        
        if (!$user) {
            return $this->failNotFound('Employee not found');
        }
        
        $data = $this->request->getJSON(true);
        
        // Update full_name if name fields changed
        if (isset($data['first_name']) || isset($data['middle_name']) || isset($data['last_name'])) {
            $data['full_name'] = trim(
                ($data['first_name'] ?? $user['first_name']) . ' ' . 
                ($data['middle_name'] ?? $user['middle_name']) . ' ' . 
                ($data['last_name'] ?? $user['last_name'])
            );
        }
        
        // Hash password if provided
        if (isset($data['password']) && !empty($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        } else {
            unset($data['password']);
        }
        
        if ($model->update($id, $data)) {
            return $this->respond([
                'status' => 'success',
                'message' => 'Employee updated successfully'
            ]);
        }
        
        return $this->fail($model->errors());
    }

    public function delete($id = null)
    {
        $model = new UserModel();
        
        if (!$model->find($id)) {
            return $this->failNotFound('User not found');
        }
        
        if ($model->delete($id)) {
            return $this->respondDeleted([
                'status' => 'success',
                'message' => 'User deleted successfully'
            ]);
        }
        
        return $this->fail('Failed to delete user');
    }

    public function technicians()
    {
        $db = \Config\Database::connect();
        $technicians = $db->table('users u')
            ->select('u.*, d.department_name')
            ->join('departments d', 'd.id = u.department_id', 'left')
            ->whereIn('u.role', ['technician', 'senior_technician'])
            ->get()->getResultArray();
        
        // Fetch skills for each technician
        foreach ($technicians as &$tech) {
            $skills = $db->table('user_skills us')
                ->select('us.*, s.skill_name, s.category_id')
                ->join('skills s', 's.id = us.skill_id', 'left')
                ->where('us.user_id', $tech['id'])
                ->get()->getResultArray();
            $tech['skills'] = $skills;
        }
        
        return $this->respond([
            'status' => 'success',
            'data' => $technicians
        ]);
    }

    public function supervisors()
    {
        $db = \Config\Database::connect();
        $supervisors = $db->table('users')
            ->whereIn('role', ['supervisor', 'manager', 'admin'])
            ->get()->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $supervisors
        ]);
    }

    public function resetPassword($id = null)
    {
        $model = new UserModel();
        $user = $model->find($id);
        
        if (!$user) {
            return $this->failNotFound('User not found');
        }
        
        $data = $this->request->getJSON(true);
        $newPassword = $data['new_password'] ?? null;
        
        if (!$newPassword) {
            return $this->fail('New password is required');
        }
        
        // Hash the new password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        if ($model->update($id, ['password' => $hashedPassword])) {
            return $this->respond([
                'status' => 'success',
                'message' => 'Password reset successfully'
            ]);
        }
        
        return $this->fail('Failed to reset password');
    }
}
