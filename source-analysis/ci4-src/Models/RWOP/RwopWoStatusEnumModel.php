<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopWoStatusEnumModel extends Model
{
    protected $table = 'rwop_wo_status_enum';
    protected $primaryKey = 'status_code';
    protected $returnType = 'array';
    protected $allowedFields = ['status_code', 'status_name', 'sequence_order', 'is_terminal', 'requires_verification', 'description'];
    protected $useTimestamps = false;
    
    public function getActiveStatuses()
    {
        return $this->orderBy('sequence_order', 'ASC')->findAll();
    }
    
    public function requiresVerification($statusCode)
    {
        $status = $this->find($statusCode);
        return $status ? $status['requires_verification'] : false;
    }
}
