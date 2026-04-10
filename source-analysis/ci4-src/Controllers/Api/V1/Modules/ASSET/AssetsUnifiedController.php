<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Traits\PlantScopeTrait;
use App\Traits\PermissionTrait;

/**
 * Assets Unified Controller
 * Enterprise asset management with RBAC and plant isolation
 */
class AssetsUnifiedController extends BaseApiController
{
    use PlantScopeTrait, PermissionTrait;

    protected $modelName = 'App\Models\AssetUnifiedModel';
    protected $format = 'json';

    public function __construct()
    {
        $this->initializeService();
    }

    public function index()
    {
        // Check permissions
        if (!$this->checkPermission('assets', 'view')) {
            return $this->forbiddenResponse('Insufficient permissions to view assets');
        }

        // Require ASSET module
        $this->requireModule('ASSET');

        $query = $this->model->select('*');

        // Plant isolation - critical for multi-tenant security
        $this->applyPlantScope($query);

        // Advanced Filters
        if ($status = $this->request->getGet('filter_status')) {
            $query->whereIn('status', explode(',', $status));
        }
        if ($type = $this->request->getGet('filter_type')) {
            $query->whereIn('asset_type', explode(',', $type));
        }
        if ($criticality = $this->request->getGet('filter_criticality')) {
            $query->whereIn('criticality', explode(',', $criticality));
        }
        if ($healthMin = $this->request->getGet('health_min')) {
            $query->where('health_score >=', $healthMin);
        }

        // Search
        if ($search = $this->request->getGet('search')) {
            $query->groupStart()
                ->like('asset_name', $search)
                ->orLike('asset_code', $search)
                ->orLike('serial_number', $search)
                ->groupEnd();
        }

        // Sorting
        $sort = $this->request->getGet('sort') ?? 'asset_name';
        $order = $this->request->getGet('order') ?? 'ASC';
        $allowedSorts = ['asset_name', 'asset_code', 'created_at', 'status', 'criticality'];
        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, strtoupper($order) === 'DESC' ? 'DESC' : 'ASC');
        }

        // Pagination
        $page = max(1, (int)($this->request->getGet('page') ?? 1));
        $perPage = min(100, max(1, (int)($this->request->getGet('per_page') ?? 50)));

        $total = $query->countAllResults(false);
        $data = $query->paginate($perPage, 'default', $page);

        // Include relationships
        $include = $this->request->getGet('include');
        if ($include && in_array('children', explode(',', $include))) {
            foreach ($data as &$asset) {
                $asset['children'] = $this->model->where('parent_id', $asset['id'])
                    ->whereIn('plant_id', $this->getPlantIds())
                    ->findAll();
            }
        }

        return $this->paginatedResponse($data, $page, $perPage, $total, 'Assets retrieved successfully');
    }

    public function show($id = null)
    {
        if (!$id || !is_numeric($id)) {
            return $this->validationErrorResponse(['id' => 'Valid asset ID required']);
        }

        if (!$this->checkPermission('assets', 'view')) {
            return $this->forbiddenResponse('Insufficient permissions to view assets');
        }

        $this->requireModule('ASSET');

        $query = $this->model->where('id', $id);
        $this->applyPlantScope($query);
        $asset = $query->first();

        if (!$asset) {
            return $this->notFoundResponse('Asset not found or access denied');
        }

        // Include relationships if requested
        if ($this->request->getGet('include')) {
            $includes = explode(',', $this->request->getGet('include'));

            if (in_array('children', $includes)) {
                $asset['children'] = $this->model->where('parent_id', $id)
                    ->whereIn('plant_id', $this->getPlantIds())
                    ->findAll();
            }
            if (in_array('parent', $includes) && $asset['parent_id']) {
                $asset['parent'] = $this->model->where('id', $asset['parent_id'])
                    ->whereIn('plant_id', $this->getPlantIds())
                    ->first();
            }
            if (in_array('bom', $includes)) {
                $asset['bom'] = $this->db->table('bom')
                    ->where('parent_asset_id', $id)
                    ->whereIn('plant_id', $this->getPlantIds())
                    ->get()
                    ->getResultArray();
            }
        }

        return $this->successResponse($asset, 'Asset retrieved successfully');
    }

    public function hierarchy($id)
    {
        if (!$id || !is_numeric($id)) {
            return $this->validationErrorResponse(['id' => 'Valid asset ID required']);
        }

        if (!$this->checkPermission('assets', 'view')) {
            return $this->forbiddenResponse('Insufficient permissions to view asset hierarchy');
        }

        $this->requireModule('ASSET');

        // Verify user can access this asset
        if (!$this->validateResourceOwnership('assets_unified', (int)$id)) {
            return $this->notFoundResponse('Asset not found or access denied');
        }

        $depth = min(10, max(1, (int)($this->request->getGet('depth') ?? 5)));

        try {
            $descendants = $this->db->query("
                SELECT a.*, c.depth
                FROM assets_unified a
                JOIN asset_closure c ON a.id = c.descendant_id
                WHERE c.ancestor_id = ? AND c.depth <= ? AND c.depth > 0
                AND a.plant_id IN (" . implode(',', $this->getPlantIds()) . ")
                ORDER BY c.depth, a.asset_name
            ", [$id, $depth])->getResultArray();

            return $this->successResponse($descendants, 'Asset hierarchy retrieved successfully');
        } catch (\Exception $e) {
            log_message('error', 'Asset hierarchy query failed: ' . $e->getMessage());
            return $this->errorResponse('Failed to retrieve asset hierarchy', 500);
        }
    }

    public function create()
    {
        if (!$this->checkPermission('assets', 'create')) {
            return $this->forbiddenResponse('Insufficient permissions to create assets');
        }

        $this->requireModule('ASSET');

        $data = $this->request->getJSON(true);

        // Validate required fields
        $validationRules = [
            'asset_name' => 'required|min_length[2]|max_length[255]',
            'asset_type' => 'required|in_list[equipment,machine,component,system,facility]'
        ];

        if (!$this->validate($validationRules, $data)) {
            return $this->validationErrorResponse($this->validator->getErrors());
        }

        // Force plant_id to user's current plant
        $data['plant_id'] = $this->getPlantId();
        $data['created_by'] = $this->getCurrentUserId();

        try {
            if ($this->model->insert($data)) {
                $insertId = $this->model->getInsertID();

                // Update asset_id with the inserted id for consistency
                $this->model->update($insertId, ['asset_id' => $insertId]);

                // Audit log
                $this->auditLog('create', 'asset', $insertId, null, $data);

                $asset = $this->model->find($insertId);
                return $this->createdResponse($asset, 'Asset created successfully');
            }

            return $this->errorResponse('Failed to create asset: ' . implode(', ', $this->model->errors()), 422);
        } catch (\Exception $e) {
            log_message('error', 'Asset creation failed: ' . $e->getMessage());
            return $this->errorResponse('Failed to create asset', 500);
        }
    }

    public function update($id = null)
    {
        if (!$id || !is_numeric($id)) {
            return $this->validationErrorResponse(['id' => 'Valid asset ID required']);
        }

        if (!$this->checkPermission('assets', 'update')) {
            return $this->forbiddenResponse('Insufficient permissions to update assets');
        }

        $this->requireModule('ASSET');

        // Verify asset belongs to user's plants
        if (!$this->validateResourceOwnership('assets_unified', (int)$id)) {
            return $this->notFoundResponse('Asset not found or access denied');
        }

        $data = $this->request->getJSON(true);

        // Prevent changing plant_id or asset_id
        unset($data['plant_id'], $data['asset_id']);
        $data['updated_by'] = $this->getCurrentUserId();
        $data['updated_at'] = date('Y-m-d H:i:s');

        // Get old data for audit
        $oldAsset = $this->model->find($id);

        try {
            if ($this->model->update($id, $data)) {
                // Audit log
                $this->auditLog('update', 'asset', (int)$id, (array)$oldAsset, $data);

                $asset = $this->model->find($id);
                return $this->successResponse($asset, 'Asset updated successfully');
            }

            return $this->errorResponse('Failed to update asset: ' . implode(', ', $this->model->errors()), 422);
        } catch (\Exception $e) {
            log_message('error', 'Asset update failed: ' . $e->getMessage());
            return $this->errorResponse('Failed to update asset', 500);
        }
    }

    public function delete($id = null)
    {
        if (!$id || !is_numeric($id)) {
            return $this->validationErrorResponse(['id' => 'Valid asset ID required']);
        }

        if (!$this->checkPermission('assets', 'delete')) {
            return $this->forbiddenResponse('Insufficient permissions to delete assets');
        }

        $this->requireModule('ASSET');

        // Verify asset belongs to user's plants
        if (!$this->validateResourceOwnership('assets_unified', (int)$id)) {
            return $this->notFoundResponse('Asset not found or access denied');
        }

        // Check for dependencies
        $hasChildren = $this->model->where('parent_id', $id)->countAllResults() > 0;
        $hasWorkOrders = $this->db->table('work_orders')->where('asset_id', $id)->countAllResults() > 0;

        if ($hasChildren || $hasWorkOrders) {
            return $this->errorResponse('Cannot delete asset with existing children or work orders', 409);
        }

        // Get data for audit
        $asset = $this->model->find($id);

        try {
            if ($this->model->delete($id)) {
                // Audit log
                $this->auditLog('delete', 'asset', (int)$id, (array)$asset, null);

                return $this->successResponse(null, 'Asset deleted successfully');
            }

            return $this->errorResponse('Failed to delete asset', 500);
        } catch (\Exception $e) {
            log_message('error', 'Asset deletion failed: ' . $e->getMessage());
            return $this->errorResponse('Failed to delete asset', 500);
        }
    }

    public function batch()
    {
        if (!$this->checkPermission('assets', 'create')) {
            return $this->forbiddenResponse('Insufficient permissions to create assets');
        }

        $this->requireModule('ASSET');

        $assets = $this->request->getJSON(true)['assets'] ?? [];

        if (empty($assets) || !is_array($assets)) {
            return $this->validationErrorResponse(['assets' => 'Array of assets required']);
        }

        if (count($assets) > 50) {
            return $this->validationErrorResponse(['assets' => 'Maximum 50 assets per batch']);
        }

        $results = ['success' => [], 'errors' => []];
        $plantId = $this->getPlantId();
        $userId = $this->getCurrentUserId();

        foreach ($assets as $index => $asset) {
            try {
                $asset['plant_id'] = $plantId;
                $asset['created_by'] = $userId;

                if ($this->model->insert($asset)) {
                    $insertId = $this->model->getInsertID();
                    $this->model->update($insertId, ['asset_id' => $insertId]);

                    $results['success'][] = $this->model->find($insertId);
                } else {
                    $results['errors'][] = [
                        'index' => $index,
                        'errors' => $this->model->errors()
                    ];
                }
            } catch (\Exception $e) {
                $results['errors'][] = [
                    'index' => $index,
                    'error' => $e->getMessage()
                ];
            }
        }

        return $this->successResponse($results, 'Batch operation completed');
    }
}