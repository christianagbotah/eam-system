<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopVerificationTemplateModel extends Model
{
    protected $table = 'rwop_verification_templates';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['name', 'wo_type', 'checklist_items', 'is_active'];
    protected $useTimestamps = true;
    
    public function getByWoType($woType)
    {
        return $this->where('wo_type', $woType)
                    ->where('is_active', 1)
                    ->first();
    }
    
    public function getDefaultTemplate()
    {
        return $this->where('wo_type IS NULL')
                    ->where('is_active', 1)
                    ->first();
    }
}
