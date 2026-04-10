<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopMrStatusEnumModel extends Model
{
    protected $table = 'rwop_mr_status_enum';
    protected $primaryKey = 'status_code';
    protected $returnType = 'array';
    protected $allowedFields = ['status_code', 'status_name', 'sequence_order', 'is_terminal', 'description'];
    protected $useTimestamps = false;
    
    public function getActiveStatuses()
    {
        return $this->orderBy('sequence_order', 'ASC')->findAll();
    }
    
    public function isTerminalStatus($statusCode)
    {
        $status = $this->find($statusCode);
        return $status ? $status['is_terminal'] : false;
    }
}
