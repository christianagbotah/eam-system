<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\BaseController;
use App\Models\WorkOrderMaterialModel;

class WorkOrderMaterialController extends BaseController
{
    protected $materialModel;

    public function __construct()
    {
        $this->materialModel = new WorkOrderMaterialModel();
    }

    public function index()
    {
        $workOrderId = $this->request->getGet('work_order_id');
        $materials = $workOrderId 
            ? $this->materialModel->getByWorkOrder($workOrderId)
            : $this->materialModel->findAll();

        return $this->respond(['status' => 'success', 'data' => $materials]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $data['issued_at'] = $data['issued_at'] ?? date('Y-m-d H:i:s');
        $data['issued_by'] = $data['issued_by'] ?? 1; // Get from JWT

        if (!$this->materialModel->insert($data)) {
            return $this->fail($this->materialModel->errors());
        }

        // Update work order total material cost
        $workOrderId = $data['work_order_id'];
        $totalCost = $this->materialModel->getTotalCost($workOrderId);
        
        $workOrderModel = new \App\Models\WorkOrderModel();
        $workOrderModel->update($workOrderId, ['total_material_cost' => $totalCost]);

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Material issued',
            'data' => ['id' => $this->materialModel->getInsertID()]
        ]);
    }

    public function delete($id = null)
    {
        $material = $this->materialModel->find($id);
        $this->materialModel->delete($id);

        // Recalculate total
        if ($material) {
            $totalCost = $this->materialModel->getTotalCost($material['work_order_id']);
            $workOrderModel = new \App\Models\WorkOrderModel();
            $workOrderModel->update($material['work_order_id'], ['total_material_cost' => $totalCost]);
        }

        return $this->respond(['status' => 'success', 'message' => 'Material removed']);
    }
}
