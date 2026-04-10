<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\MachineModel;
use CodeIgniter\HTTP\ResponseInterface;

class MachineController extends BaseApiController
{
    protected $machineModel;

    public function __construct()
    {
        $this->machineModel = new MachineModel();
    }

    public function index()
    {
        try {
            $machines = $this->machineModel->findAll();
            return $this->respond([
                'status' => 'success',
                'data' => $machines
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Error loading machines: ' . $e->getMessage());
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function show($id = null)
    {
        try {
            $machine = $this->machineModel->find($id);
            if (!$machine) {
                return $this->failNotFound('Machine not found');
            }
            return $this->respond([
                'status' => 'success',
                'data' => $machine
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $db->transStart();
        
        try {
            $data = $this->validatePlantInRequest($this->request->getPost());
            if ($data instanceof ResponseInterface) return $data;
            
            $this->validateBusinessRules($data);
            
            $file = $this->request->getFile('machine_photo');
            if ($file && $file->isValid()) {
                $newName = $file->getRandomName();
                $file->move(WRITEPATH . 'uploads/machines/', $newName);
                $data['machine_photo'] = 'uploads/machines/' . $newName;
            }

            if (empty($data['machine_code'])) {
                $data['machine_code'] = 'M-' . str_pad($this->machineModel->countAll() + 1, 4, '0', STR_PAD_LEFT);
            }

            $id = $this->machineModel->insert($data);
            
            if (!$id) {
                $db->transRollback();
                return $this->respondError('Failed to create machine', $this->machineModel->errors());
            }

            $db->table('assets_unified')->insert([
                'asset_name' => $data['machine_name'],
                'asset_code' => $data['machine_code'],
                'asset_type' => 'machine',
                'parent_id' => null,
                'status' => $data['status'] ?? 'active',
                'criticality' => $data['criticality'] ?? 'medium',
                'asset_id' => $id
            ]);
            $unifiedId = $db->insertID();

            $db->table('asset_closure')->insert([
                'ancestor_id' => $unifiedId,
                'descendant_id' => $unifiedId,
                'depth' => 0
            ]);

            $this->initializePerformanceTracking($id, $data);
            $this->auditLog('create', 'machine', $id, $data);
            
            $db->transComplete();
            
            if ($db->transStatus() === false) {
                return $this->respondError('Failed to create machine', null, 500);
            }

            return $this->respondSuccess(['id' => $id], 'Machine created successfully');
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->respondError('Failed to create machine: ' . $e->getMessage(), null, 500);
        }
    }

    public function update($id = null)
    {
        try {
            $machine = $this->machineModel->find($id);
            if (!$machine) {
                return $this->failNotFound('Machine not found');
            }

            $data = $this->request->getRawInput();
            unset($data['plant_id']);
        
            $file = $this->request->getFile('machine_photo');
            if ($file && $file->isValid()) {
                $newName = $file->getRandomName();
                $file->move(WRITEPATH . 'uploads/machines/', $newName);
                $data['machine_photo'] = 'uploads/machines/' . $newName;
            }

            $updated = $this->machineModel->update($id, $data);
            
            if (!$updated) {
                return $this->failValidationErrors($this->machineModel->errors());
            }

            $db = \Config\Database::connect();
            $unifiedAsset = $db->table('assets_unified')->where('asset_id', $id)->where('asset_type', 'machine')->get()->getRowArray();
            if ($unifiedAsset) {
                $db->table('assets_unified')->where('id', $unifiedAsset['id'])->update([
                    'asset_name' => $data['machine_name'] ?? $unifiedAsset['asset_name'],
                    'asset_code' => $data['machine_code'] ?? $unifiedAsset['asset_code'],
                    'status' => $data['status'] ?? $unifiedAsset['status'],
                    'criticality' => $data['criticality'] ?? $unifiedAsset['criticality']
                ]);
            }

            $this->updateRelatedRecords($id, $machine, $data);
            $this->queueERPSync($id, 'update', $data);
            
            return $this->respond([
                'success' => true,
                'data' => $this->machineModel->find($id),
                'message' => 'Machine updated successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to update machine: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        try {
            $machine = $this->machineModel->find($id);
            if (!$machine) {
                return $this->failNotFound('Machine not found');
            }

            $this->machineModel->delete($id);

            return $this->respondDeleted([
                'status' => 'success',
                'message' => 'Machine deleted successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function assemblies($machineId = null)
    {
        try {
            $assemblyModel = new \App\Models\AssemblyModel();
            $assemblies = $assemblyModel
                ->select('assemblies.*, COUNT(parts.id) as parts_count')
                ->join('parts', 'parts.component_id = assemblies.id', 'left')
                ->where('assemblies.equipment_id', $machineId)
                ->groupBy('assemblies.id')
                ->findAll();

            foreach ($assemblies as &$assembly) {
                $assembly['machine_id'] = $assembly['equipment_id'];
            }

            return $this->respond([
                'success' => true,
                'data' => $assemblies
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch assemblies: ' . $e->getMessage());
        }
    }

    private function validateBusinessRules($data)
    {
        if (!empty($data['commissioning_date']) && !empty($data['installation_date'])) {
            if (strtotime($data['commissioning_date']) < strtotime($data['installation_date'])) {
                throw new \Exception('Commissioning date cannot be before installation date');
            }
        }
        
        if (!empty($data['acquisition_cost']) && $data['acquisition_cost'] < 0) {
            throw new \Exception('Acquisition cost must be positive');
        }
        
        if (!empty($data['salvage_value']) && !empty($data['acquisition_cost'])) {
            if ($data['salvage_value'] > $data['acquisition_cost']) {
                throw new \Exception('Salvage value cannot exceed acquisition cost');
            }
        }
        
        if (!empty($data['mtbf_hours']) && $data['mtbf_hours'] <= 0) {
            throw new \Exception('MTBF must be positive');
        }
        
        if (!empty($data['mttr_hours']) && $data['mttr_hours'] <= 0) {
            throw new \Exception('MTTR must be positive');
        }
    }

    private function initializePerformanceTracking($machineId, $data)
    {
        $db = \Config\Database::connect();
        
        try {
            if (!empty($data['oee_target'])) {
                $db->table('oee_records')->insert([
                    'equipment_id' => $machineId,
                    'equipment_type' => 'machine',
                    'target_oee' => $data['oee_target'],
                    'availability_target' => 90.0,
                    'performance_target' => 95.0,
                    'quality_target' => 99.0,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
            
            if (!empty($data['mtbf_hours']) || !empty($data['mttr_hours'])) {
                $db->table('reliability_metrics')->insert([
                    'machine_id' => $machineId,
                    'mtbf_target' => $data['mtbf_hours'] ?? null,
                    'mttr_target' => $data['mttr_hours'] ?? null,
                    'mtbf_actual' => 0,
                    'mttr_actual' => 0,
                    'failure_count' => 0,
                    'total_downtime_hours' => 0,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
            
            if (!empty($data['calibration_required']) && $data['calibration_required'] === 'yes' && !empty($data['calibration_frequency_days'])) {
                $nextDate = date('Y-m-d', strtotime('+' . $data['calibration_frequency_days'] . ' days'));
                $db->table('calibration_schedules')->insert([
                    'machine_id' => $machineId,
                    'frequency_days' => $data['calibration_frequency_days'],
                    'next_due_date' => $nextDate,
                    'status' => 'scheduled',
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
            
            if (!empty($data['criticality']) && in_array($data['criticality'], ['high', 'critical'])) {
                $db->table('iot_devices')->insert([
                    'device_name' => $data['machine_name'] . ' - IoT Monitor',
                    'device_type' => 'sensor_gateway',
                    'asset_id' => $machineId,
                    'asset_type' => 'machine',
                    'status' => 'pending_setup',
                    'connection_status' => 'offline',
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
            
            $this->queueERPSync($machineId, 'create', $data);
        } catch (\Exception $e) {
            log_message('error', 'Performance tracking initialization failed for machine ' . $machineId . ': ' . $e->getMessage());
            throw $e;
        }
    }

    private function updateRelatedRecords($machineId, $oldData, $newData)
    {
        $db = \Config\Database::connect();
        
        if (isset($newData['mtbf_hours']) || isset($newData['mttr_hours'])) {
            $existing = $db->table('reliability_metrics')->where('machine_id', $machineId)->get()->getRowArray();
            if ($existing) {
                $db->table('reliability_metrics')->where('machine_id', $machineId)->update([
                    'mtbf_target' => $newData['mtbf_hours'] ?? $existing['mtbf_target'],
                    'mttr_target' => $newData['mttr_hours'] ?? $existing['mttr_target'],
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            } else {
                $db->table('reliability_metrics')->insert([
                    'machine_id' => $machineId,
                    'mtbf_target' => $newData['mtbf_hours'] ?? null,
                    'mttr_target' => $newData['mttr_hours'] ?? null,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
        }
        
        if (isset($newData['oee_target'])) {
            $db->table('oee_records')
                ->where('equipment_id', $machineId)
                ->where('equipment_type', 'machine')
                ->update(['target_oee' => $newData['oee_target']]);
        }
        
        if (isset($newData['machine_name']) && $newData['machine_name'] !== $oldData['machine_name']) {
            $db->table('iot_devices')
                ->where('asset_id', $machineId)
                ->where('asset_type', 'machine')
                ->update(['device_name' => $newData['machine_name'] . ' - IoT Monitor']);
        }
        
        if (isset($newData['calibration_frequency_days'])) {
            $existing = $db->table('calibration_schedules')->where('machine_id', $machineId)->get()->getRowArray();
            if ($existing) {
                $nextDate = date('Y-m-d', strtotime('+' . $newData['calibration_frequency_days'] . ' days'));
                $db->table('calibration_schedules')->where('machine_id', $machineId)->update([
                    'frequency_days' => $newData['calibration_frequency_days'],
                    'next_due_date' => $nextDate,
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }
        }
    }

    private function queueERPSync($machineId, $action, $data)
    {
        $db = \Config\Database::connect();
        
        $syncSchedule = $db->table('erp_sync_schedules')
            ->where('entity_type', 'assets')
            ->where('is_active', 1)
            ->get()->getRowArray();
        
        if ($syncSchedule) {
            $db->table('erp_sync_log')->insert([
                'entity_type' => 'machine',
                'entity_id' => $machineId,
                'action' => $action,
                'sync_direction' => 'outbound',
                'status' => 'pending',
                'payload' => json_encode([
                    'machine_code' => $data['machine_code'] ?? null,
                    'machine_name' => $data['machine_name'] ?? null,
                    'acquisition_cost' => $data['acquisition_cost'] ?? null,
                    'department' => $data['department'] ?? null,
                    'status' => $data['status'] ?? null
                ]),
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }
}
