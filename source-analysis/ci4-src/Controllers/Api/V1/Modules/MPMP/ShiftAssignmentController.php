<?php
namespace App\Controllers\Api\V1\Modules\MPMP;
use App\Controllers\BaseController;
use App\Models\ShiftAssignmentModel;
use CodeIgniter\API\ResponseTrait;

class ShiftAssignmentController extends BaseController {
    use ResponseTrait;
    protected $model;
    
    public function __construct() {
        $this->model = new ShiftAssignmentModel();
    }
    
    public function index() {
        $filters = [
            'user_id' => $this->request->getGet('user_id'),
            'shift_id' => $this->request->getGet('shift_id'),
            'department_id' => $this->request->getGet('department_id'),
            'date_from' => $this->request->getGet('date_from'),
            'date_to' => $this->request->getGet('date_to')
        ];
        $assignments = $this->model->getWithDetails($filters);
        return $this->respond(['status' => 'success', 'data' => $assignments]);
    }
    
    public function create() {
        $data = $this->request->getJSON(true);
        
        $rules = [
            'user_id' => 'required|integer',
            'shift_id' => 'required|integer',
            'start_date' => 'required|valid_date'
        ];
        
        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors(), 422);
        }
        
        $id = $this->model->insert($data);
        return $this->respondCreated(['status' => 'success', 'message' => 'Shift assigned', 'data' => ['id' => $id]]);
    }
    
    public function bulkCreate() {
        $data = $this->request->getJSON(true);
        $assignments = $data['assignments'] ?? [];
        
        $successful = 0;
        $failed = 0;
        $errors = [];
        
        foreach ($assignments as $assignment) {
            try {
                $this->model->insert($assignment);
                $successful++;
            } catch (\Exception $e) {
                $failed++;
                $errors[] = $e->getMessage();
            }
        }
        
        return $this->respond([
            'status' => 'success',
            'message' => "Bulk assignment completed: $successful successful, $failed failed",
            'data' => ['successful' => $successful, 'failed' => $failed, 'errors' => $errors]
        ]);
    }
    
    public function delete($id = null) {
        if (!$this->model->find($id)) return $this->failNotFound('Assignment not found');
        $this->model->delete($id);
        return $this->respond(['status' => 'success', 'message' => 'Assignment deleted']);
    }
}
