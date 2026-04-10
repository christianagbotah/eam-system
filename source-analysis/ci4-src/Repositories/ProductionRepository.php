<?php

namespace App\Repositories;

class ProductionRepository extends BaseRepository
{
    protected $table = 'production';

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

    public function findById($id)
    {
        return $this->db->table($this->table)
            ->where('id', $id)
            ->get()
            ->getRowArray();
    }

    public function create($data)
    {
        $this->db->table($this->table)->insert($data);
        return $this->db->insertID();
    }

    public function update($id, $data)
    {
        return $this->db->table($this->table)
            ->where('id', $id)
            ->update($data);
    }

    public function delete($id)
    {
        return $this->db->table($this->table)
            ->where('id', $id)
            ->delete();
    }
}
