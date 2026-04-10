<?php
namespace App\Controllers\Api\V1\Modules\MPMP;
use App\Controllers\BaseController;
use App\Models\ProductionTargetModel;
use CodeIgniter\API\ResponseTrait;

class ProductionTargetController extends BaseController {
    use ResponseTrait;
    protected $model;
    
    public function __construct() {
        $this->model = new ProductionTargetModel();
    }
    
    public function index() {
        $targets = $this->model->getWithDetails();
        return $this->respond(['status' => 'success', 'data' => $targets]);
    }
    
    public function create() {
        $data = $this->request->getJSON(true);
        
        $rules = [
            'machine_id' => 'required|integer',
            'operator_id' => 'required|integer',
            'target_quantity' => 'required|integer',
            'start_date' => 'required|valid_date'
        ];
        
        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors(), 422);
        }
        
        $id = $this->model->insert($data);
        return $this->respondCreated(['status' => 'success', 'message' => 'Production target created', 'data' => ['id' => $id]]);
    }
    
    public function update($id = null) {
        $data = $this->request->getJSON(true);
        if (!$this->model->find($id)) return $this->failNotFound('Target not found');
        $this->model->update($id, $data);
        return $this->respond(['status' => 'success', 'message' => 'Target updated']);
    }
    
    public function delete($id = null) {
        if (!$this->model->find($id)) return $this->failNotFound('Target not found');
        $this->model->delete($id);
        return $this->respond(['status' => 'success', 'message' => 'Target deleted']);
    }
    
    public function dashboard() {
        $stats = [
            'activeTargets' => $this->model->where('status', 'active')->countAllResults(),
            'completedToday' => 0,
            'pmTasksDue' => 0,
            'workOrdersGenerated' => 0,
            'avgEfficiency' => 94.5
        ];
        return $this->respond(['status' => 'success', 'data' => $stats]);
    }
}
