<?php

namespace App\Repositories;

class EamUserRepository extends BaseRepository
{
    protected $table = 'users';

    private function attachSkills(&$users)
    {
        if (empty($users)) return;
        
        $isSingleUser = !isset($users[0]);
        if ($isSingleUser) {
            $users = [$users];
        }
        
        try {
            foreach ($users as &$user) {
                if (!empty($user['trade'])) {
                    $skill = $this->db->table('skills')
                        ->select('name as skill_name')
                        ->where('id', $user['trade'])
                        ->get()
                        ->getRowArray();
                    
                    $user['trade_skill_name'] = $skill['skill_name'] ?? null;
                    log_message('debug', 'User ' . $user['id'] . ' trade: ' . $user['trade'] . ' -> skill: ' . ($skill['skill_name'] ?? 'NOT FOUND'));
                } else {
                    $user['trade_skill_name'] = null;
                    log_message('debug', 'User ' . $user['id'] . ' has no trade value');
                }
            }
        } catch (\Exception $e) {
            log_message('error', 'Error attaching skills: ' . $e->getMessage());
            foreach ($users as &$user) {
                $user['trade_skill_name'] = null;
            }
        }
        
        if ($isSingleUser) {
            $users = $users[0];
        }
    }

    public function paginate($page, $limit, $search = '')
    {
        $offset = ($page - 1) * $limit;
        $builder = $this->db->table($this->table . ' u')
            ->select('u.*, s.name as trade_skill_name')
            ->join('skills s', 's.id = u.trade', 'left');
        
        if ($search) {
            $builder->groupStart()
                ->like('u.username', $search)
                ->orLike('u.full_name', $search)
                ->orLike('u.email', $search)
                ->orLike('u.role', $search)
                ->groupEnd();
        }
        
        $total = $builder->countAllResults(false);
        $users = $builder->limit($limit, $offset)->get()->getResultArray();
        
        return [
            'status' => 'success',
            'data' => $users,
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total]
        ];
    }

    public function create($data)
    {
        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        $this->db->table($this->table)->insert($data);
        return $this->db->insertID();
    }

    public function find($id)
    {
        $user = $this->db->table($this->table)->where('id', $id)->get()->getRowArray();
        if ($user) {
            $this->attachSkills($user);
        }
        return $user;
    }

    public function update($id, $data)
    {
        return $this->db->table($this->table)->where('id', $id)->update($data);
    }

    public function findByUsername($username)
    {
        $user = $this->db->table($this->table)
            ->groupStart()
                ->where('username', $username)
                ->orWhere('email', $username)
            ->groupEnd()
            ->get()
            ->getRowArray();
        if ($user) {
            $this->attachSkills($user);
        }
        return $user;
    }

    public function assignRole($userId, $roleId)
    {
        $this->db->table('user_roles')->insert(['user_id' => $userId, 'role_id' => $roleId]);
        return $this->db->affectedRows() > 0;
    }

    public function findByRole($role, $plannerType = null)
    {
        $builder = $this->db->table($this->table)->where('role', $role);
        
        if ($plannerType) {
            $builder->where('planner_type', $plannerType);
        }
        
        $users = $builder->get()->getResultArray();
        $this->attachSkills($users);
        
        return [
            'status' => 'success',
            'data' => $users
        ];
    }
}
