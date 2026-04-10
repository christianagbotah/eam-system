<?php
namespace App\Controllers\Api\V1\Modules\MPMP;
use App\Controllers\BaseController;
use App\Models\MeterReadingModel;
use CodeIgniter\API\ResponseTrait;

class MeterReadingController extends BaseController {
    use ResponseTrait;
    protected $model;
    
    public function __construct() {
        $this->model = new MeterReadingModel();
    }
    
    public function index() {
        $filters = [
            'machine_id' => $this->request->getGet('machine_id'),
            'date_from' => $this->request->getGet('date_from'),
            'date_to' => $this->request->getGet('date_to')
        ];
        $readings = $this->model->getWithDetails($filters);
        return $this->respond(['status' => 'success', 'data' => $readings]);
    }
    
    public function create() {
        $data = $this->request->getJSON(true);
        
        $rules = [
            'machine_id' => 'required|integer',
            'reading' => 'required|integer',
            'date' => 'required|valid_date'
        ];
        
        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors(), 422);
        }
        
        $id = $this->model->insert($data);
        return $this->respondCreated(['status' => 'success', 'message' => 'Meter reading recorded', 'data' => ['id' => $id]]);
    }
    
    public function delete($id = null) {
        if (!$this->model->find($id)) return $this->failNotFound('Reading not found');
        $this->model->delete($id);
        return $this->respond(['status' => 'success', 'message' => 'Reading deleted']);
    }
}
