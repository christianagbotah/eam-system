<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;

class WorkOrderTemplateController extends BaseResourceController
{
    protected $modelName = 'App\Models\WorkOrderTemplateModel';
    protected $format = 'json';

    public function index()
    {
        $templates = $this->model->findAll();
        return $this->respond(['status' => 'success', 'data' => $templates]);
    }

    public function show($id = null)
    {
        $template = $this->model->find($id);
        if (!$template) {
            return $this->failNotFound('Template not found');
        }
        return $this->respond(['status' => 'success', 'data' => $template]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $data['created_by'] = $this->request->user_id ?? 1;
        $data['checklist'] = isset($data['checklist']) ? json_encode($data['checklist']) : null;
        $data['required_parts'] = isset($data['required_parts']) ? json_encode($data['required_parts']) : null;

        if ($this->model->insert($data)) {
            return $this->respondCreated(['status' => 'success', 'message' => 'Template created', 'id' => $this->model->getInsertID()]);
        }
        return $this->fail($this->model->errors());
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        $data['checklist'] = isset($data['checklist']) ? json_encode($data['checklist']) : null;
        $data['required_parts'] = isset($data['required_parts']) ? json_encode($data['required_parts']) : null;

        if ($this->model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'message' => 'Template updated']);
        }
        return $this->fail($this->model->errors());
    }

    public function delete($id = null)
    {
        if ($this->model->delete($id)) {
            return $this->respondDeleted(['status' => 'success', 'message' => 'Template deleted']);
        }
        return $this->fail('Failed to delete template');
    }
}
