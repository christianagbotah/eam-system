<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopFailureModeModel extends Model
{
    protected $table = 'rwop_failure_modes';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['code', 'version', 'name', 'category', 'description', 'is_active', 'retired_at', 'replaced_by_id'];
    protected $useTimestamps = true;
    
    public function getActiveByCategory($category = null)
    {
        $builder = $this->where('is_active', 1);
        if ($category) {
            $builder->where('category', $category);
        }
        return $builder->orderBy('code', 'ASC')->findAll();
    }
    
    public function getLatestVersion($code)
    {
        return $this->where('code', $code)
                    ->where('is_active', 1)
                    ->orderBy('version', 'DESC')
                    ->first();
    }
}
