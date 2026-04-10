<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\AssetRelationshipModel;
use App\Services\Asset\RelationshipGraphService;

class RelationshipController extends BaseApiController
{
    protected $relationshipModel;
    protected $graphService;

    public function __construct()
    {
        $this->relationshipModel = new AssetRelationshipModel();
        $this->graphService = new RelationshipGraphService();
    }

    public function create()
    {
        $data = $this->request->getJSON(true);

        $rules = [
            'source_asset_id' => 'required|integer',
            'target_asset_id' => 'required|integer',
            'relationship_type' => 'required|in_list[powers,feeds,controls,depends_on,similar_to,replaces,part_of]'
        ];

        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors());
        }

        try {
            $id = $this->relationshipModel->insert($data);
            return $this->respondCreated(['id' => $id, 'data' => $data]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function getRelationships($assetId)
    {
        try {
            $relationships = $this->relationshipModel
                ->where('source_asset_id', $assetId)
                ->orWhere('target_asset_id', $assetId)
                ->findAll();
            return $this->respond(['data' => $relationships]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function getGraph($assetId)
    {
        $depth = $this->request->getGet('depth') ?? 2;

        try {
            $connected = $this->graphService->getConnectedAssets($assetId, $depth);
            return $this->respond(['data' => $connected]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function findPath()
    {
        $sourceId = $this->request->getGet('source');
        $targetId = $this->request->getGet('target');

        if (!$sourceId || !$targetId) {
            return $this->fail('Source and target IDs are required');
        }

        try {
            $path = $this->graphService->findPath($sourceId, $targetId);
            return $this->respond(['data' => $path]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function delete($id = null)
    {
        if (!$id) {
            return $this->fail('Relationship ID is required');
        }
        
        try {
            $this->relationshipModel->delete($id);
            return $this->respondDeleted(['id' => $id]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
}
