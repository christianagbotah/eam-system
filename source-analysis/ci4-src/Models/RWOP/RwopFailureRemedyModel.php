<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopFailureRemedyModel extends Model
{
    protected $table = 'rwop_failure_remedies';
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
}
