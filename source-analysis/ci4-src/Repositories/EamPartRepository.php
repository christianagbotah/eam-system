<?php

namespace App\Repositories;

class EamPartRepository extends BaseRepository
{
    protected $table = 'parts';
    
    public function create($data)
    {
        // Remove machine_id as it's not in the parts table
        unset($data['machine_id']);
        
        // Auto-generate part_code if empty
        if (empty($data['part_code'])) {
            $data['part_code'] = 'PART-' . strtoupper(substr(md5(uniqid()), 0, 8));
        }
        
        // Set timestamps
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        // Handle empty parent_part_id
        if (empty($data['parent_part_id'])) {
            $data['parent_part_id'] = null;
        }
        
        $this->db->table($this->table)->insert($data);
        return $this->db->insertID();
    }
    
    public function update($id, $data)
    {
        // Remove machine_id as it's not in the parts table
        unset($data['machine_id']);
        
        // Set updated timestamp
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        // Handle empty parent_part_id
        if (empty($data['parent_part_id'])) {
            $data['parent_part_id'] = null;
        }
        
        return $this->db->table($this->table)->where('id', $id)->update($data);
    }
}
