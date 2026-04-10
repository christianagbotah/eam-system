<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;

class VerificationsController extends BaseResourceController
{
    protected $format = 'json';

    public function pending()
    {
        $db = \Config\Database::connect();
        $verifications = $db->table('work_orders wo')
            ->select('wo.id, wo.wo_number, wo.title, wo.status, wo.verification_required')
            ->where('wo.status', 'completed')
            ->where('wo.verification_required', 1)
            ->where('wo.verification_status', 'pending')
            ->orderBy('wo.updated_at', 'DESC')
            ->get()->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $verifications]);
    }

    public function getChecklist($id)
    {
        $db = \Config\Database::connect();
        $wo = $db->table('work_orders')->where('id', $id)->get()->getRowArray();
        
        if (!$wo) {
            return $this->failNotFound('Work order not found');
        }
        
        $template = $db->table('rwop_verification_templates')
            ->where('wo_type', $wo['wo_type'])
            ->where('is_active', 1)
            ->get()->getRowArray();
        
        if (!$template) {
            return $this->respond(['status' => 'success', 'data' => ['checklist' => []]]);
        }
        
        return $this->respond(['status' => 'success', 'data' => [
            'template_id' => $template['id'],
            'checklist' => json_decode($template['checklist_items'], true)
        ]]);
    }
}
