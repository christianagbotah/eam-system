<?php

namespace App\Controllers\Api\V1\Modules\MPMP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Models\ProductionTargetModel;
use App\Models\OperatorProductionDataModel;

class ProductionDataController extends BaseResourceController
{
    protected $format = 'json';

    public function setTarget()
    {
        $model = new ProductionTargetModel();
        $data = $this->request->getJSON(true);
        $data['created_by'] = $this->request->user_id ?? 1;

        if ($model->insert($data)) {
            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Production target set successfully',
                'data' => ['id' => $model->getInsertID()]
            ]);
        }

        return $this->fail($model->errors());
    }

    public function submitOperatorData()
    {
        $model = new OperatorProductionDataModel();
        $data = $this->request->getJSON(true);
        $data['operator_id'] = $this->request->user_id ?? 1;
        $data['entry_date'] = date('Y-m-d');

        if ($model->insert($data)) {
            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Production data submitted successfully',
                'data' => ['id' => $model->getInsertID()]
            ]);
        }

        return $this->fail($model->errors());
    }

    public function getMyTarget()
    {
        $model = new ProductionTargetModel();
        $userId = $this->request->user_id ?? 1;
        
        $target = $model->where('target_date', date('Y-m-d'))
                       ->orderBy('created_at', 'DESC')
                       ->first();

        if ($target) {
            return $this->respond([
                'status' => 'success',
                'data' => $target
            ]);
        }

        return $this->failNotFound('No target found for today');
    }

    public function generateReport()
    {
        $type = $this->request->getGet('type') ?? 'data_sheet';
        $startDate = $this->request->getGet('start_date') ?? date('Y-m-d');
        $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');

        $db = \Config\Database::connect();
        
        if ($type === 'data_sheet') {
            $query = $db->table('operator_production_data opd')
                       ->select('pte.work_center, pte.code, opd.*, u.username as operator_name')
                       ->join('production_targets_enhanced pte', 'pte.id = opd.target_id')
                       ->join('users u', 'u.id = opd.operator_id')
                       ->where('opd.entry_date >=', $startDate)
                       ->where('opd.entry_date <=', $endDate)
                       ->get();
        } else {
            $query = $db->table('production_data_summary')
                       ->where('report_date >=', $startDate)
                       ->where('report_date <=', $endDate)
                       ->get();
        }

        return $this->respond([
            'status' => 'success',
            'data' => $query->getResultArray()
        ]);
    }
}
