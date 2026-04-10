<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\ShiftService;

class DepartmentsController extends BaseApiController
{
    protected $modelName = 'App\Models\DepartmentModel';
    protected $shiftService;

    public function index()
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view departments');
        }

        $hierarchical = $this->request->getGet('hierarchical') === 'true';

        if ($hierarchical) {
            $data = $this->model->getDepartmentHierarchy();
            // Audit log
            $this->auditLog('VIEW', 'departments', 0, null, ['hierarchical' => true, 'count' => count($data)]);
            return $this->respond([
                'status' => 'success',
                'data' => $data,
                'message' => 'Department hierarchy retrieved successfully'
            ]);
        }

        $data = $this->model->getDepartmentsWithSupervisors();
        // Audit log
        $this->auditLog('VIEW', 'departments', 0, null, ['count' => count($data)]);
        return $this->respond([
            'status' => 'success',
            'data' => $data,
            'message' => 'Departments retrieved successfully'
        ]);
    }

    public function mainDepartments()
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view main departments');
        }

        $data = $this->model->getMainDepartments();

        // Audit log
        $this->auditLog('VIEW', 'main_departments', 0, null, ['count' => count($data)]);

        return $this->respond([
            'status' => 'success',
            'data' => $data,
            'message' => 'Main departments retrieved successfully'
        ]);
    }

    public function subDepartments($parentId = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view sub-departments');
        }

        if (!$this->model->find($parentId)) {
            return $this->failNotFound('Parent department not found');
        }

        $data = $this->model->getSubDepartments($parentId);

        // Audit log
        $this->auditLog('VIEW', 'sub_departments', $parentId, null, ['count' => count($data)]);

        return $this->respond([
            'status' => 'success',
            'data' => $data,
            'message' => 'Sub-departments retrieved successfully'
        ]);
    }

    public function show($id = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view department details');
        }

        $data = $this->model->getDepartmentWithSupervisor($id);
        if (!$data) {
            return $this->failNotFound('Department not found');
        }

        // Add sub-departments if main department
        if ($data['level'] == 1 || !$data['parent_id']) {
            $data['sub_departments'] = $this->model->getSubDepartments($id);
        }

        // Add department path
        $data['path'] = $this->model->getDepartmentPath($id);

        // Audit log
        $this->auditLog('VIEW_DETAIL', 'departments', $id);

        return $this->respond([
            'status' => 'success',
            'data' => $data,
            'message' => 'Department retrieved successfully'
        ]);
    }

    public function create()
    {
        // Permission check
        if (!$this->checkPermission('user', 'create')) {
            return $this->failForbidden('Insufficient permissions to create departments');
        }

        $data = $this->request->getJSON(true);
        
        // Validate parent_id if provided
        if (!empty($data['parent_id'])) {
            $parent = $this->model->find($data['parent_id']);
            if (!$parent) {
                return $this->fail('Parent department not found');
            }
            // Sub-departments are level 2
            $data['level'] = 2;
        } else {
            // Main departments are level 1
            $data['level'] = 1;
        }
        
        if ($this->model->insert($data)) {
            $newId = $this->model->getInsertID();
            // Audit log
            $this->auditLog('CREATE', 'departments', $newId, null, $data);
            return $this->respondCreated([
                'status' => 'success',
                'data' => ['id' => $newId],
                'message' => 'Department created successfully'
            ]);
        }
        return $this->fail($this->model->errors());
    }

    public function update($id = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'update')) {
            return $this->failForbidden('Insufficient permissions to update departments');
        }

        $data = $this->request->getJSON(true);
        if ($this->model->update($id, $data)) {
            // Audit log
            $this->auditLog('UPDATE', 'departments', $id, null, $data);
            return $this->respond([
                'status' => 'success',
                'message' => 'Department updated successfully'
            ]);
        }
        return $this->fail($this->model->errors());
    }

    public function delete($id = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'delete')) {
            return $this->failForbidden('Insufficient permissions to delete departments');
        }

        if ($this->model->delete($id)) {
            // Audit log
            $this->auditLog('DELETE', 'departments', $id, null, null);
            return $this->respondDeleted([
                'status' => 'success',
                'message' => 'Department deleted successfully'
            ]);
        }
        return $this->failNotFound('Department not found');
    }
    
    public function roster($id = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view department roster');
        }

        $date = $this->request->getGet('date') ?? date('Y-m-d');
        
        if (!$this->model->find($id)) {
            return $this->failNotFound('Department not found');
        }
        
        $shiftService = new ShiftService();
        $result = $shiftService->getDepartmentRoster($id, $date);
        
        if ($result['status'] === 'error') {
            return $this->fail($result['message']);
        }

        // Audit log
        $this->auditLog('VIEW', 'department_roster', $id, null, ['date' => $date]);

        return $this->respond($result);
    }

    public function generateStaffId($id = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'create')) {
            return $this->failForbidden('Insufficient permissions to generate staff IDs');
        }

        $department = $this->model->find($id);
        if (!$department) {
            return $this->failNotFound('Department not found');
        }

        $format = $department['staff_id_format'] ?? 'DEPT-{XXXX}';
        $counter = $department['staff_id_counter'] ?? 1;
        
        // Replace {XXXX} with padded counter
        $staffId = str_replace('{XXXX}', str_pad($counter, 4, '0', STR_PAD_LEFT), $format);
        
        // Increment counter
        $this->model->update($id, ['staff_id_counter' => $counter + 1]);

        // Audit log
        $this->auditLog('GENERATE_STAFF_ID', 'departments', $id, null, ['staff_id' => $staffId]);

        return $this->respond([
            'status' => 'success',
            'data' => ['staff_id' => $staffId]
        ]);
    }
}
