<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseResourceController;

class ShiftAssignmentController extends BaseResourceController
{
    protected $format = 'json';
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function index()
    {
        $assignments = $this->db->table('shift_assignments sa')
            ->select('sa.*, u.username as operator_name, s.name as shift_name, m.machine_name')
            ->join('users u', 'u.id = sa.user_id', 'left')
            ->join('shifts s', 's.id = sa.shift_id', 'left')
            ->join('machines m', 'm.id = sa.machine_id', 'left')
            ->get()
            ->getResultArray();

        return $this->respond(['status' => 'success', 'data' => $assignments]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        
        $insertData = [
            'user_id' => $data['user_id'],
            'shift_id' => $data['shift_id'],
            'machine_id' => $data['machine_id'],
            'target_quantity' => $data['target_quantity'] ?? null,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'] ?? null,
            'created_at' => date('Y-m-d H:i:s')
        ];

        if ($this->db->table('shift_assignments')->insert($insertData)) {
            return $this->respondCreated(['status' => 'success', 'message' => 'Assignment created']);
        }

        return $this->fail('Failed to create assignment');
    }

    public function delete($id = null)
    {
        if ($this->db->table('shift_assignments')->delete(['id' => $id])) {
            return $this->respondDeleted(['status' => 'success', 'message' => 'Assignment deleted']);
        }

        return $this->fail('Failed to delete assignment');
    }
}
