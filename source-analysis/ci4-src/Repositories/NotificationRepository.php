<?php

namespace App\Repositories;

use CodeIgniter\Database\BaseBuilder;

class NotificationRepository
{
    protected $db;
    protected $table = 'notifications';

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function findByUser(int $userId, array $params): array
    {
        $builder = $this->db->table($this->table);
        $builder->where('user_id', $userId);

        if ($params['search']) {
            $builder->like('message', $params['search']);
        }

        $total = $builder->countAllResults(false);
        $data = $builder->orderBy($params['sort_by'], $params['sort_order'])
            ->limit($params['per_page'], ($params['page'] - 1) * $params['per_page'])
            ->get()->getResultArray();

        return ['data' => $data, 'total' => $total];
    }

    public function findById(int $id): ?array
    {
        return $this->db->table($this->table)->where('id', $id)->get()->getRowArray();
    }

    public function update(int $id, array $data): bool
    {
        return $this->db->table($this->table)->where('id', $id)->update($data);
    }

    public function delete(int $id): bool
    {
        return $this->db->table($this->table)->where('id', $id)->delete();
    }

    public function getUnreadCount(int $userId): int
    {
        return $this->db->table($this->table)
            ->where('user_id', $userId)
            ->where('is_read', 0)
            ->countAllResults();
    }

    public function create(array $data): ?int
    {
        return $this->db->table($this->table)->insert($data) ? $this->db->insertID() : null;
    }
}
