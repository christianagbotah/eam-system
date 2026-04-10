<?php
namespace App\Controllers\Api\V1\Modules\MPMP;
use App\Controllers\BaseController;
use App\Models\WorkCenterModel;
use CodeIgniter\API\ResponseTrait;

class WorkCenterController extends BaseController {
    use ResponseTrait;
    protected $model;
    
    public function __construct() {
        $this->model = new WorkCenterModel();
    }
    
    public function index() {
        $centers = $this->model->getWithDetails();
        return $this->respond(['status' => 'success', 'data' => $centers]);
    }
    
    public function show($id = null) {
        $center = $this->model->find($id);
        if (!$center) return $this->failNotFound('Work center not found');
        return $this->respond(['status' => 'success', 'data' => $center]);
    }
    
    public function create() {
        $data = $this->request->getJSON(true);
        
        $rules = [
            'name' => 'required',
            'capacity' => 'required|integer'
        ];
        
        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors(), 422);
        }
        
        $id = $this->model->insert($data);
        return $this->respondCreated(['status' => 'success', 'message' => 'Work center created', 'data' => ['id' => $id]]);
    }
    
    public function update($id = null) {
        $data = $this->request->getJSON(true);
        if (!$this->model->find($id)) return $this->failNotFound('Work center not found');
        $this->model->update($id, $data);
        return $this->respond(['status' => 'success', 'message' => 'Work center updated']);
    }
    
    public function delete($id = null) {
        if (!$this->model->find($id)) return $this->failNotFound('Work center not found');
        $this->model->delete($id);
        return $this->respond(['status' => 'success', 'message' => 'Work center deleted']);
    }
}
