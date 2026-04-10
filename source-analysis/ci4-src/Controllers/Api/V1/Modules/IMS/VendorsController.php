<?php

namespace App\Controllers\Api\V1\Modules\IMS;

use App\Controllers\Api\V1\BaseApiController;

class VendorsController extends BaseApiController
{
    protected $format = 'json';

    public function index()
    {
        // Permission check
        if (!$this->checkPermission('supplier', 'view')) {
            return $this->failForbidden('Insufficient permissions to view suppliers');
        }

        $db = \Config\Database::connect();

        $query = "SELECT
            v.*,
            COUNT(DISTINCT c.id) as total_contracts,
            SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as active_contracts,
            COALESCE(SUM(c.value), 0) as total_spent,
            COALESCE(AVG(p.quality_score), 0) as performance_score,
            COALESCE(AVG(p.rating), 0) as rating
        FROM vendors v
        LEFT JOIN vendor_contracts c ON v.id = c.vendor_id
        LEFT JOIN vendor_performance p ON v.id = p.vendor_id
        GROUP BY v.id
        ORDER BY v.vendor_name";

        $vendors = $db->query($query)->getResultArray();

        // Audit log
        $this->auditLog('VIEW', 'vendors', 0, null, ['count' => count($vendors)]);

        return $this->respond(['status' => 'success', 'data' => $vendors]);
    }

    public function show($id = null)
    {
        // Permission check
        if (!$this->checkPermission('supplier', 'view')) {
            return $this->failForbidden('Insufficient permissions to view supplier details');
        }

        $db = \Config\Database::connect();
        $vendor = $db->table('vendors')->where('id', $id)->get()->getRowArray();

        if (!$vendor) {
            return $this->failNotFound('Vendor not found');
        }

        $contracts = $db->table('vendor_contracts')->where('vendor_id', $id)->get()->getResultArray();
        $performance = $db->table('vendor_performance')->where('vendor_id', $id)->orderBy('evaluation_date', 'DESC')->limit(10)->get()->getResultArray();

        // Audit log
        $this->auditLog('VIEW_DETAIL', 'vendors', $id);

        return $this->respond([
            'status' => 'success',
            'data' => [
                'vendor' => $vendor,
                'contracts' => $contracts,
                'performance' => $performance
            ]
        ]);
    }

    public function create()
    {
        // Permission check
        if (!$this->checkPermission('supplier', 'create')) {
            return $this->failForbidden('Insufficient permissions to create suppliers');
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $vendorCode = 'VND-' . str_pad($db->table('vendors')->countAll() + 1, 3, '0', STR_PAD_LEFT);

        $insertData = [
            'vendor_code' => $vendorCode,
            'vendor_name' => $data['name'],
            'contact_person' => $data['contact_person'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'status' => 'active'
        ];

        $db->table('vendors')->insert($insertData);

        $newId = $db->insertID();

        // Audit log
        $this->auditLog('CREATE', 'vendors', $newId, null, $insertData);

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Vendor added',
            'vendor_code' => $vendorCode,
            'id' => $newId
        ]);
    }

    public function update($id = null)
    {
        // Permission check
        if (!$this->checkPermission('supplier', 'update')) {
            return $this->failForbidden('Insufficient permissions to update suppliers');
        }

        // Validate resource ownership (if vendors have plant_id)
        if (!$this->validateResourceOwnership('vendors', $id)) {
            return $this->failForbidden('Access denied to this supplier');
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        // Get old data for audit
        $oldData = $db->table('vendors')->where('id', $id)->get()->getRowArray();

        $db->table('vendors')->update($data, ['id' => $id]);

        // Audit log
        $this->auditLog('UPDATE', 'vendors', $id, $oldData, $data);

        return $this->respond(['status' => 'success', 'message' => 'Vendor updated']);
    }

    public function createContract()
    {
        // Permission check
        if (!$this->checkPermission('supplier', 'create')) {
            return $this->failForbidden('Insufficient permissions to create supplier contracts');
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $contractNumber = 'CNT-' . date('Y') . '-' . str_pad($db->table('vendor_contracts')->countAll() + 1, 3, '0', STR_PAD_LEFT);

        $insertData = [
            'vendor_id' => $data['vendor_id'],
            'contract_number' => $contractNumber,
            'title' => $data['title'],
            'contract_type' => $data['contract_type'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'value' => $data['value'],
            'status' => 'active',
            'sla_response_time' => $data['sla_response_time'] ?? null,
            'sla_resolution_time' => $data['sla_resolution_time'] ?? null
        ];

        $db->table('vendor_contracts')->insert($insertData);

        $newId = $db->insertID();

        // Audit log
        $this->auditLog('CREATE_CONTRACT', 'vendor_contracts', $newId, null, $insertData);

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Contract created',
            'contract_number' => $contractNumber,
            'id' => $newId
        ]);
    }

    public function ratePerformance()
    {
        // Permission check
        if (!$this->checkPermission('supplier', 'update')) {
            return $this->failForbidden('Insufficient permissions to rate supplier performance');
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        $insertData = [
            'vendor_id' => $data['vendor_id'],
            'work_order_id' => $data['work_order_id'] ?? null,
            'rating' => $data['rating'],
            'on_time' => $data['on_time'] ?? true,
            'quality_score' => $data['quality_score'] ?? null,
            'comments' => $data['comments'] ?? null,
            'evaluated_by' => $userId,
            'evaluation_date' => date('Y-m-d')
        ];

        $db->table('vendor_performance')->insert($insertData);

        $newId = $db->insertID();

        // Audit log
        $this->auditLog('RATE_PERFORMANCE', 'vendor_performance', $newId, null, $insertData);

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Performance rated',
            'id' => $newId
        ]);
    }

    public function getContracts()
    {
        // Permission check
        if (!$this->checkPermission('supplier', 'view')) {
            return $this->failForbidden('Insufficient permissions to view supplier contracts');
        }

        $db = \Config\Database::connect();

        $query = "SELECT
            c.*,
            v.vendor_name
        FROM vendor_contracts c
        JOIN vendors v ON c.vendor_id = v.id
        WHERE c.status = 'active'
        ORDER BY c.end_date";

        $contracts = $db->query($query)->getResultArray();

        // Audit log
        $this->auditLog('VIEW_CONTRACTS', 'vendor_contracts', 0, null, ['count' => count($contracts)]);

        return $this->respond(['status' => 'success', 'data' => $contracts]);
    }
}
