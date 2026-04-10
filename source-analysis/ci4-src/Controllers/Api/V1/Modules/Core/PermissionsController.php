<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class PermissionsController extends ResourceController
{
    protected $format = 'json';
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function index()
    {
        $permissions = $this->db->table('permissions')
            ->orderBy('module', 'ASC')
            ->orderBy('action', 'ASC')
            ->get()
            ->getResultArray();

        $grouped = [];
        foreach ($permissions as $permission) {
            $module = $permission['module'];
            if (!isset($grouped[$module])) {
                $grouped[$module] = [];
            }
            $grouped[$module][] = $permission;
        }

        return $this->respond([
            'status' => 'success',
            'data' => $permissions,
            'grouped' => $grouped
        ]);
    }

    public function show($id = null)
    {
        $permission = $this->db->table('permissions')
            ->where('id', $id)
            ->get()
            ->getRowArray();

        if (!$permission) {
            return $this->failNotFound('Permission not found');
        }

        return $this->respond([
            'status' => 'success',
            'data' => $permission
        ]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);

        $validation = \Config\Services::validation();
        $validation->setRules([
            'name' => 'required|is_unique[permissions.name]',
            'display_name' => 'required',
            'module' => 'required',
            'action' => 'required'
        ]);

        if (!$validation->run($data)) {
            return $this->fail($validation->getErrors());
        }

        $this->db->table('permissions')->insert($data);

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Permission created successfully',
            'id' => $this->db->insertID()
        ]);
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);

        $existing = $this->db->table('permissions')->where('id', $id)->get()->getRowArray();
        if (!$existing) {
            return $this->failNotFound('Permission not found');
        }

        $this->db->table('permissions')->where('id', $id)->update($data);

        return $this->respond([
            'status' => 'success',
            'message' => 'Permission updated successfully'
        ]);
    }

    public function delete($id = null)
    {
        $existing = $this->db->table('permissions')->where('id', $id)->get()->getRowArray();
        if (!$existing) {
            return $this->failNotFound('Permission not found');
        }

        if ($existing['is_system_permission']) {
            return $this->fail('Cannot delete system permission');
        }

        $this->db->table('permissions')->where('id', $id)->delete();

        return $this->respondDeleted([
            'status' => 'success',
            'message' => 'Permission deleted successfully'
        ]);
    }
}
