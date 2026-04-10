<?php

namespace App\Controllers\Api\V1\Modules\TRAC;

use App\Controllers\Api\V1\BaseResourceController;
use CodeIgniter\API\ResponseTrait;

class LOTOController extends BaseResourceController
{
    use ResponseTrait;

    protected $procedureModel;
    protected $applicationModel;
    protected $lockModel;

    public function __construct()
    {
        $this->procedureModel = model('LOTOProcedureModel');
        $this->applicationModel = model('LOTOApplicationModel');
        $this->lockModel = model('LOTOLockModel');
    }

    public function index()
    {
        $procedures = $this->procedureModel
            ->where('active', true)
            ->orderBy('procedure_name', 'ASC')
            ->findAll();
        
        return $this->respond(['status' => 'success', 'data' => $procedures]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $userId = $this->request->user_id ?? 1;
        
        $data['created_by'] = $userId;
        $data['created_at'] = date('Y-m-d H:i:s');
        
        $id = $this->procedureModel->insert($data);
        
        return $this->respondCreated([
            'status' => 'success',
            'message' => 'LOTO procedure created',
            'data' => ['id' => $id]
        ]);
    }

    public function apply()
    {
        $data = $this->request->getJSON(true);
        $userId = $this->request->user_id ?? 1;
        
        $applicationData = [
            'permit_id' => $data['permit_id'] ?? null,
            'work_order_id' => $data['work_order_id'] ?? null,
            'equipment_id' => $data['equipment_id'],
            'procedure_id' => $data['procedure_id'],
            'applied_by' => $userId,
            'applied_at' => date('Y-m-d H:i:s'),
            'lock_numbers' => json_encode($data['lock_numbers']),
            'tag_numbers' => json_encode($data['tag_numbers']),
            'status' => 'applied',
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $id = $this->applicationModel->insert($applicationData);
        
        // Update lock status
        foreach ($data['lock_numbers'] as $lockNum) {
            $this->lockModel->where('lock_number', $lockNum)->set(['status' => 'in_use'])->update();
        }
        
        return $this->respondCreated([
            'status' => 'success',
            'message' => 'LOTO applied successfully',
            'data' => ['id' => $id]
        ]);
    }

    public function verify($id)
    {
        $userId = $this->request->user_id ?? 1;
        $input = $this->request->getJSON(true);
        
        $this->applicationModel->update($id, [
            'verified_by' => $userId,
            'verified_at' => date('Y-m-d H:i:s'),
            'zero_energy_confirmed' => $input['zero_energy_confirmed'] ?? false,
            'verification_notes' => $input['verification_notes'] ?? null,
            'status' => 'verified',
            'updated_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'LOTO verified'
        ]);
    }

    public function remove($id)
    {
        $userId = $this->request->user_id ?? 1;
        $input = $this->request->getJSON(true);
        
        $application = $this->applicationModel->find($id);
        if (!$application) return $this->failNotFound('LOTO application not found');
        
        $this->applicationModel->update($id, [
            'removed_by' => $userId,
            'removed_at' => date('Y-m-d H:i:s'),
            'equipment_tested' => $input['equipment_tested'] ?? false,
            'removal_notes' => $input['removal_notes'] ?? null,
            'status' => 'removed',
            'updated_at' => date('Y-m-d H:i:s')
        ]);
        
        // Release locks
        $lockNumbers = json_decode($application['lock_numbers'], true);
        foreach ($lockNumbers as $lockNum) {
            $this->lockModel->where('lock_number', $lockNum)->set(['status' => 'available'])->update();
        }
        
        return $this->respond([
            'status' => 'success',
            'message' => 'LOTO removed successfully'
        ]);
    }

    public function active()
    {
        $applications = $this->applicationModel
            ->select('loto_applications.*, machines.machine_name as equipment_name')
            ->join('machines', 'machines.id = loto_applications.equipment_id', 'left')
            ->whereIn('loto_applications.status', ['applied', 'verified', 'active'])
            ->orderBy('applied_at', 'DESC')
            ->findAll();
        
        return $this->respond(['status' => 'success', 'data' => $applications]);
    }
}
