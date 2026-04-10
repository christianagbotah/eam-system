<?php
namespace App\Controllers\Api\V1\Modules\MPMP;
use App\Controllers\BaseController;
use App\Models\DowntimeLogModel;
use CodeIgniter\API\ResponseTrait;

class DowntimeController extends BaseController {
    use ResponseTrait;
    protected $model;
    
    public function __construct() {
        $this->model = new DowntimeLogModel();
    }
    
    public function index() {
        $filters = [
            'machine_id' => $this->request->getGet('machine_id'),
            'category' => $this->request->getGet('category'),
            'date_from' => $this->request->getGet('date_from'),
            'date_to' => $this->request->getGet('date_to')
        ];
        $logs = $this->model->getWithDetails($filters);
        return $this->respond(['status' => 'success', 'data' => $logs]);
    }
    
    public function create() {
        $data = $this->request->getJSON(true);
        
        $rules = [
            'machine_id' => 'required|integer',
            'start_time' => 'required',
            'category' => 'required'
        ];
        
        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors(), 422);
        }
        
        $id = $this->model->insert($data);
        return $this->respondCreated(['status' => 'success', 'message' => 'Downtime logged', 'data' => ['id' => $id]]);
    }
    
    public function update($id = null) {
        $data = $this->request->getJSON(true);
        if (!$this->model->find($id)) return $this->failNotFound('Downtime log not found');
        $this->model->update($id, $data);
        return $this->respond(['status' => 'success', 'message' => 'Downtime updated']);
    }
    
    public function delete($id = null) {
        if (!$this->model->find($id)) return $this->failNotFound('Downtime log not found');
        $this->model->delete($id);
        return $this->respond(['status' => 'success', 'message' => 'Downtime deleted']);
    }
    
    public function pareto() {
        $dateFrom = $this->request->getGet('date_from');
        $dateTo = $this->request->getGet('date_to');
        
        $builder = $this->model->builder();
        if ($dateFrom) $builder->where('DATE(start_time) >=', $dateFrom);
        if ($dateTo) $builder->where('DATE(start_time) <=', $dateTo);
        
        $results = $builder->select('category, SUM(duration_minutes) as total_minutes')
            ->groupBy('category')
            ->orderBy('total_minutes', 'DESC')
            ->get()->getResultArray();
        
        $total = array_sum(array_column($results, 'total_minutes'));
        $cumulative = 0;
        
        foreach ($results as &$result) {
            $result['percentage'] = $total > 0 ? round(($result['total_minutes'] / $total) * 100, 2) : 0;
            $cumulative += $result['percentage'];
            $result['cumulative_percentage'] = round($cumulative, 2);
        }
        
        return $this->respond(['status' => 'success', 'data' => $results]);
    }
}
