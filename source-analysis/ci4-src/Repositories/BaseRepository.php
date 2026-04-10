<?php

namespace App\Repositories;

use CodeIgniter\Database\ConnectionInterface;
use App\Traits\PlantScopeTrait;

class BaseRepository
{
    use PlantScopeTrait;
    
    protected $db;
    protected $table;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function find($id)
    {
        $builder = $this->db->table($this->table)->where('id', $id);
        $this->applyPlantScope($builder);
        return $builder->get()->getRowArray();
    }

    public function create($data)
    {
        $this->db->table($this->table)->insert($data);
        return $this->db->insertID();
    }

    public function update($id, $data)
    {
        return $this->db->table($this->table)->where('id', $id)->update($data);
    }

    public function delete($id)
    {
        return $this->db->table($this->table)->where('id', $id)->delete();
    }

    public function paginate($page, $limit, $search = '')
    {
        $offset = ($page - 1) * $limit;
        $builder = $this->db->table($this->table);
        
        log_message('debug', 'BaseRepository paginate - table: ' . $this->table);
        
        $this->applyPlantScope($builder);
        
        if ($search) {
            $builder->groupStart()
                ->like('name', $search)
                ->orLike('asset_name', $search)
                ->orLike('asset_code', $search)
                ->orLike('code', $search)
                ->groupEnd();
        }
        
        $total = $builder->countAllResults(false);
        log_message('debug', 'BaseRepository paginate - total: ' . $total);
        
        $data = $builder->limit($limit, $offset)->get()->getResultArray();
        log_message('debug', 'BaseRepository paginate - data count: ' . count($data));
        
        return [
            'status' => 'success',
            'data' => $data,
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total]
        ];
    }
}
