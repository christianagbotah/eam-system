<?php

namespace App\Services;

use App\Repositories\AssetRepository;

class AssetService
{
    protected $repository;

    public function __construct()
    {
        $this->repository = new AssetRepository();
    }

    /**
     * Create a node in the asset hierarchy
     * 
     * @param string $type - facility|system|equipment|assembly|component|part|sub_part
     * @param array $payload - {name, code, parent_id, ...}
     * @return array {status, data, message}
     * 
     * Validation:
     * - name: required, max 255
     * - code: required, unique per type, max 50
     * - parent_id: required (except facility), must exist
     * 
     * Queries:
     * - INSERT INTO {type}s (name, code, {parent}_id, created_at)
     * - SELECT id FROM {parent_type}s WHERE id = ?
     */
    public function createHierarchyNode($type, $payload)
    {
        // Validate type
        $validTypes = ['facility', 'system', 'equipment', 'assembly', 'component', 'part', 'sub_part'];
        if (!in_array($type, $validTypes)) {
            return ['status' => 'error', 'message' => 'Invalid asset type'];
        }

        // Validate required fields
        if (empty($payload['name']) || empty($payload['code'])) {
            return ['status' => 'error', 'message' => 'Name and code are required'];
        }

        // Validate parent exists (except for facility)
        if ($type !== 'facility') {
            $parentField = $this->getParentField($type);
            if (empty($payload[$parentField])) {
                return ['status' => 'error', 'message' => 'Parent ID is required'];
            }
            
            if (!$this->repository->parentExists($type, $payload[$parentField])) {
                return ['status' => 'error', 'message' => 'Parent not found'];
            }
        }

        // Check code uniqueness
        if ($this->repository->codeExists($type, $payload['code'])) {
            return ['status' => 'error', 'message' => 'Code already exists'];
        }

        // Create node
        $id = $this->repository->create($type, $payload);
        
        return [
            'status' => 'success',
            'data' => ['id' => $id],
            'message' => ucfirst($type) . ' created successfully'
        ];
    }

    /**
     * Get complete hierarchy tree
     * 
     * @param int|null $facilityId - optional filter
     * @return array {status, data, message}
     * 
     * Queries:
     * - SELECT * FROM facilities WHERE id = ? OR ? IS NULL
     * - SELECT * FROM systems WHERE facility_id IN (...)
     * - SELECT * FROM equipment WHERE system_id IN (...)
     * - SELECT * FROM assemblies WHERE equipment_id IN (...)
     * - SELECT * FROM components WHERE assembly_id IN (...)
     * - SELECT * FROM parts WHERE component_id IN (...)
     * - SELECT * FROM sub_parts WHERE part_id IN (...)
     */
    public function getHierarchyTree($facilityId = null)
    {
        $tree = $this->repository->buildHierarchyTree($facilityId);
        
        return [
            'status' => 'success',
            'data' => $tree,
            'message' => 'Hierarchy retrieved successfully'
        ];
    }

    /**
     * Move asset to new parent
     * 
     * @param string $type - asset type
     * @param int $assetId
     * @param int $newParentId
     * @return array {status, message}
     * 
     * Validation:
     * - Asset must exist
     * - New parent must exist and be correct type
     * - Cannot move to descendant (circular reference)
     * 
     * Queries:
     * - SELECT id FROM {type}s WHERE id = ?
     * - SELECT id FROM {parent_type}s WHERE id = ?
     * - UPDATE {type}s SET {parent}_id = ? WHERE id = ?
     */
    public function moveAsset($type, $assetId, $newParentId)
    {
        // Validate asset exists
        if (!$this->repository->exists($type, $assetId)) {
            return ['status' => 'error', 'message' => 'Asset not found'];
        }

        // Validate new parent exists
        $parentType = $this->getParentType($type);
        if (!$this->repository->exists($parentType, $newParentId)) {
            return ['status' => 'error', 'message' => 'New parent not found'];
        }

        // Check for circular reference
        if ($this->repository->isDescendant($type, $assetId, $newParentId)) {
            return ['status' => 'error', 'message' => 'Cannot move to descendant'];
        }

        // Move asset
        $this->repository->updateParent($type, $assetId, $newParentId);
        
        return [
            'status' => 'success',
            'message' => 'Asset moved successfully'
        ];
    }

    private function getParentField($type)
    {
        $map = [
            'system' => 'facility_id',
            'equipment' => 'system_id',
            'assembly' => 'equipment_id',
            'component' => 'assembly_id',
            'part' => 'component_id',
            'sub_part' => 'part_id'
        ];
        return $map[$type] ?? null;
    }

    private function getParentType($type)
    {
        $map = [
            'system' => 'facility',
            'equipment' => 'system',
            'assembly' => 'equipment',
            'component' => 'assembly',
            'part' => 'component',
            'sub_part' => 'part'
        ];
        return $map[$type] ?? null;
    }
}
