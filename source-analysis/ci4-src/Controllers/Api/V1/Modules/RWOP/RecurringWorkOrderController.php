<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;

class RecurringWorkOrderController extends BaseResourceController
{
    protected $modelName = 'App\Models\RecurringWorkOrderModel';
    protected $format = 'json';

    public function index()
    {
        $recurring = $this->model->findAll();
        return $this->respond(['status' => 'success', 'data' => $recurring]);
    }

    public function show($id = null)
    {
        $recurring = $this->model->find($id);
        if (!$recurring) {
            return $this->failNotFound('Recurring work order not found');
        }
        return $this->respond(['status' => 'success', 'data' => $recurring]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $data['created_by'] = $this->request->user_id ?? 1;
        $data['next_due_date'] = $data['start_date'];

        if ($this->model->insert($data)) {
            return $this->respondCreated(['status' => 'success', 'message' => 'Recurring work order created', 'id' => $this->model->getInsertID()]);
        }
        return $this->fail($this->model->errors());
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        if ($this->model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'message' => 'Recurring work order updated']);
        }
        return $this->fail($this->model->errors());
    }

    public function delete($id = null)
    {
        if ($this->model->delete($id)) {
            return $this->respondDeleted(['status' => 'success', 'message' => 'Recurring work order deleted']);
        }
        return $this->fail('Failed to delete');
    }

    public function toggle($id = null)
    {
        $data = $this->request->getJSON(true);
        if ($this->model->update($id, ['is_active' => $data['is_active']])) {
            return $this->respond(['status' => 'success', 'message' => 'Status updated']);
        }
        return $this->fail('Failed to update status');
    }

    public function generateDue()
    {
        $db = \Config\Database::connect();
        $today = date('Y-m-d');
        
        $recurring = $this->model->where('is_active', 1)
                                  ->where('next_due_date <=', $today)
                                  ->findAll();

        $generated = 0;
        foreach ($recurring as $r) {
            $woData = [
                'recurring_id' => $r['id'],
                'template_id' => $r['template_id'],
                'title' => $r['title'],
                'description' => $r['description'],
                'machine_id' => $r['machine_id'],
                'department_id' => $r['department_id'],
                'assigned_to' => $r['assigned_to'],
                'priority' => $r['priority'],
                'type' => $r['type'],
                'status' => 'draft',
                'planned_start' => $r['next_due_date'],
                'estimated_hours' => $r['estimated_hours'],
                'created_by' => $r['created_by']
            ];

            $db->table('work_orders')->insert($woData);

            $nextDue = $this->calculateNextDue($r['next_due_date'], $r['frequency']);
            $this->model->update($r['id'], [
                'last_generated' => date('Y-m-d H:i:s'),
                'next_due_date' => $nextDue
            ]);

            $generated++;
        }

        return $this->respond(['status' => 'success', 'message' => "$generated work orders generated"]);
    }

    private function calculateNextDue($currentDate, $frequency)
    {
        $date = new \DateTime($currentDate);
        switch ($frequency) {
            case 'daily': $date->modify('+1 day'); break;
            case 'weekly': $date->modify('+1 week'); break;
            case 'biweekly': $date->modify('+2 weeks'); break;
            case 'monthly': $date->modify('+1 month'); break;
            case 'quarterly': $date->modify('+3 months'); break;
            case 'semiannual': $date->modify('+6 months'); break;
            case 'annual': $date->modify('+1 year'); break;
        }
        return $date->format('Y-m-d');
    }
}
