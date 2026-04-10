<?php

namespace App\Controllers\Api\V1\Modules\Core;

use App\Controllers\Api\V1\BaseApiController;

class LicensingController extends BaseApiController
{
    protected $db;

    public function __construct()
    {
        parent::__construct();
        $this->db = \Config\Database::connect();
    }

    public function getModules()
    {
        try {
            $modules = $this->db->table('system_modules')
                ->orderBy('module_name', 'ASC')
                ->get()
                ->getResultArray();

            return $this->respond([
                'status' => 'success',
                'data' => $modules
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Get modules error: ' . $e->getMessage());
            return $this->failServerError('Failed to fetch modules');
        }
    }

    public function updateModule($id)
    {
        try {
            $data = $this->request->getJSON(true);
            
            $updateData = [];
            if (isset($data['is_enabled'])) $updateData['is_enabled'] = $data['is_enabled'];
            if (isset($data['license_key'])) $updateData['license_key'] = $data['license_key'];
            if (isset($data['license_expires_at'])) $updateData['license_expires_at'] = $data['license_expires_at'];
            if (isset($data['max_users'])) $updateData['max_users'] = $data['max_users'];
            if (isset($data['max_plants'])) $updateData['max_plants'] = $data['max_plants'];
            
            $updateData['updated_by'] = $this->getUserId();
            $updateData['updated_at'] = date('Y-m-d H:i:s');

            $this->db->table('system_modules')
                ->where('id', $id)
                ->update($updateData);

            // Log the change
            $this->logLicenseChange($id, 'update', $data);

            return $this->respond([
                'status' => 'success',
                'message' => 'Module updated successfully'
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Update module error: ' . $e->getMessage());
            return $this->failServerError('Failed to update module');
        }
    }

    public function getLicenseAuditLog()
    {
        try {
            $logs = $this->db->table('license_audit_log l')
                ->select('l.*, u.username, u.full_name')
                ->join('users u', 'u.id = l.changed_by', 'left')
                ->orderBy('l.created_at', 'DESC')
                ->limit(100)
                ->get()
                ->getResultArray();

            return $this->respond([
                'status' => 'success',
                'data' => $logs
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Get audit log error: ' . $e->getMessage());
            return $this->failServerError('Failed to fetch audit log');
        }
    }

    private function logLicenseChange($moduleId, $action, $data)
    {
        try {
            $module = $this->db->table('system_modules')
                ->where('id', $moduleId)
                ->get()
                ->getRow();

            $this->db->table('license_audit_log')->insert([
                'module_code' => $module->module_code ?? 'unknown',
                'action' => $action,
                'new_value' => json_encode($data),
                'changed_by' => $this->getUserId(),
                'ip_address' => $this->request->getIPAddress(),
                'created_at' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Log license change error: ' . $e->getMessage());
        }
    }

    private function getUserId()
    {
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        return $userData->user_id ?? $userData->id ?? 1;
    }
}
