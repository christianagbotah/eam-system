<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseApiController;

class SkillsController extends BaseApiController
{
    public function index()
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view skills');
        }

        $db = \Config\Database::connect();
        $skills = $db->table('skills')->get()->getResultArray();

        // Audit log
        $this->auditLog('VIEW', 'skills', 0, null, ['count' => count($skills)]);
        
        return $this->respond([
            'status' => 'success',
            'data' => $skills
        ]);
    }
}
