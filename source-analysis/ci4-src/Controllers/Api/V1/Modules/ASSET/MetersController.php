<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\MeterModel;
use CodeIgniter\HTTP\ResponseInterface;

class MetersController extends BaseApiController
{
    protected $meterModel;

    public function __construct()
    {
        $this->meterModel = new MeterModel();
    }

    public function index()
    {
        try {
            $assetType = $this->request->getGet('asset_type');
            $assetId = $this->request->getGet('asset_id');
            
            $query = $this->meterModel->select('*');
                
            if ($assetType && $assetId) {
                $query->where('asset_node_type', $assetType)
                      ->where('asset_node_id', $assetId);
            }
            
            $meters = $query->findAll();

            return $this->respond([
                'success' => true,
                'data' => $meters
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch meters: ' . $e->getMessage());
        }
    }

    public function show($id = null)
    {
        try {
            $meter = $this->meterModel->find($id);

            if (!$meter) {
                return $this->failNotFound('Meter not found');
            }

            return $this->respond([
                'success' => true,
                'data' => $meter
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch meter: ' . $e->getMessage());
        }
    }

    public function create()
    {
        try {
            $data = $this->request->getPost();

            $id = $this->meterModel->insert($data);
            
            if (!$id) {
                return $this->failValidationErrors($this->meterModel->errors());
            }

            $meter = $this->meterModel->find($id);
            
            return $this->respondCreated([
                'success' => true,
                'data' => $meter,
                'message' => 'Meter created successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to create meter: ' . $e->getMessage());
        }
    }

    public function update($id = null)
    {
        try {
            $meter = $this->meterModel->find($id);
            if (!$meter) {
                return $this->failNotFound('Meter not found');
            }

            $data = $this->request->getRawInput();

            $updated = $this->meterModel->update($id, $data);
            
            if (!$updated) {
                return $this->failValidationErrors($this->meterModel->errors());
            }

            $meter = $this->meterModel->find($id);
            
            return $this->respond([
                'success' => true,
                'data' => $meter,
                'message' => 'Meter updated successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to update meter: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        try {
            $meter = $this->meterModel->find($id);
            if (!$meter) {
                return $this->failNotFound('Meter not found');
            }

            $this->meterModel->delete($id);
            
            return $this->respond([
                'success' => true,
                'message' => 'Meter deleted successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to delete meter: ' . $e->getMessage());
        }
    }

    public function updateReading($id)
    {
        try {
            $meter = $this->meterModel->find($id);
            if (!$meter) {
                return $this->failNotFound('Meter not found');
            }

            $value = $this->request->getPost('value');
            if ($value === null) {
                return $this->failValidationError('Value is required');
            }

            $data = [
                'value' => $value,
                'last_read_at' => date('Y-m-d H:i:s')
            ];

            $this->meterModel->update($id, $data);
            $meter = $this->meterModel->find($id);
            
            return $this->respond([
                'success' => true,
                'data' => $meter,
                'message' => 'Meter reading updated successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to update meter reading: ' . $e->getMessage());
        }
    }
}
