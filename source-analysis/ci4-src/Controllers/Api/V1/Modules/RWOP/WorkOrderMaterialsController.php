<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\WorkOrders\WOMaterialService;
use App\Traits\ApiResponseTrait;

class WorkOrderMaterialsController extends BaseResourceController
{
    use ApiResponseTrait;
    
    protected $materialService;
    protected $format = 'json';

    public function __construct()
    {
        $this->materialService = new WOMaterialService();
    }

    public function index($workOrderId = null)
    {
        try {
            $db = \Config\Database::connect();
            $materials = $db->table('work_order_materials wom')
                ->select('wom.*, p.part_name, p.part_code')
                ->join('parts p', 'p.id = wom.part_id', 'left')
                ->where('wom.work_order_id', $workOrderId)
                ->get()->getResultArray();

            return $this->respondSuccess($materials);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function create($workOrderId = null)
    {
        $data = $this->request->getJSON(true);

        $validation = \Config\Services::validation();
        $validation->setRules([
            'inventory_item_id' => 'required|integer',
            'quantity_required' => 'required|decimal|greater_than[0]',
            'unit_cost' => 'permit_empty|decimal'
        ]);

        if (!$validation->run($data)) {
            return $this->failValidationErrors($validation->getErrors());
        }

        try {
            $material = $this->materialService->addMaterial($workOrderId, $data);
            return $this->respondCreated([
                'success' => true,
                'data' => $material,
                'message' => 'Material added successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function issue($materialId = null)
    {
        $data = $this->request->getJSON(true);

        $validation = \Config\Services::validation();
        $validation->setRules([
            'quantity' => 'required|decimal|greater_than[0]'
        ]);

        if (!$validation->run($data)) {
            return $this->failValidationErrors($validation->getErrors());
        }

        try {
            $result = $this->materialService->issueMaterial($materialId, $data['quantity']);
            return $this->respondUpdated([
                'success' => true,
                'data' => $result,
                'message' => 'Material issued successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function reserve($workOrderId = null, $materialId = null)
    {
        try {
            $result = $this->materialService->reserveMaterial($materialId);
            return $this->respondUpdated([
                'success' => true,
                'data' => $result,
                'message' => 'Material reserved successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function release($workOrderId = null, $materialId = null)
    {
        try {
            $result = $this->materialService->releaseMaterial($materialId);
            return $this->respondUpdated([
                'success' => true,
                'data' => $result,
                'message' => 'Material released successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function update($workOrderId = null, $materialId = null)
    {
        $data = $this->request->getJSON(true);

        try {
            $db = \Config\Database::connect();
            $db->table('work_order_materials')->where('id', $materialId)->update($data);
            $material = $db->table('work_order_materials')->where('id', $materialId)->get()->getRowArray();
            
            return $this->respondUpdated([
                'success' => true,
                'data' => $material,
                'message' => 'Material updated successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function delete($materialId = null)
    {
        try {
            $db = \Config\Database::connect();
            $result = $db->table('work_order_materials')->delete(['id' => $materialId]);
            
            if ($result) {
                return $this->respondDeleted([
                    'success' => true,
                    'message' => 'Material removed successfully'
                ]);
            } else {
                return $this->failNotFound('Material not found');
            }
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }
}
