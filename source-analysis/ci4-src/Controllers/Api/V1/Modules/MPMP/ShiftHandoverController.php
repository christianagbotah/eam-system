<?php

namespace App\Controllers\Api\V1\Modules\MPMP;

use App\Controllers\BaseController;
use App\Models\ShiftHandoverModel;

class ShiftHandoverController extends BaseController
{
    protected $handoverModel;

    public function __construct()
    {
        $this->handoverModel = new ShiftHandoverModel();
    }

    public function create($surveyId)
    {
        $data = $this->request->getJSON(true);
        $data['survey_id'] = $surveyId;

        $handoverId = $this->handoverModel->insert($data);

        return $this->response->setStatusCode(201)->setJSON([
            'status' => 'success',
            'message' => 'Handover created',
            'data' => ['id' => $handoverId]
        ]);
    }

    public function get($surveyId)
    {
        $handover = $this->handoverModel->where('survey_id', $surveyId)->first();

        return $this->response->setJSON([
            'status' => 'success',
            'data' => $handover
        ]);
    }

    public function acknowledge($handoverId)
    {
        $userId = $this->request->user_id ?? 1;

        $this->handoverModel->update($handoverId, [
            'acknowledged_by' => $userId,
            'acknowledged_at' => date('Y-m-d H:i:s')
        ]);

        return $this->response->setJSON([
            'status' => 'success',
            'message' => 'Handover acknowledged'
        ]);
    }
}
