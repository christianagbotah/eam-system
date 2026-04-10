<?php

namespace App\Repositories;

class WorkOrderMaterialsRepository extends BaseRepository
{
    protected $table = 'work_order_materials';

    public function findAll(array $params = []): array
    {
        $builder = $this->db->table($this->table);
        
        // Pagination
        $page = $params['page'] ?? 1;
        $perPage = $params['per_page'] ?? 20;
        $offset = ($page - 1) * $perPage;
        
        $builder->limit($perPage, $offset);
        
        return $builder->get()->getResultArray();
    }

    public function findById(int $id): ?array
    {
        return $this->db->table($this->table)
            ->where('id', $id)
            ->get()
            ->getRowArray();
    }

    public function create(array $data): int
    {
        $this->db->table($this->table)->insert($data);
        return $this->db->insertID();
    }

    public function update(int $id, array $data): bool
    {
        return $this->db->table($this->table)
            ->where('id', $id)
            ->update($data);
    }

    public function delete(int $id): bool
    {
        return $this->db->table($this->table)
            ->where('id', $id)
            ->delete();
    }
}
