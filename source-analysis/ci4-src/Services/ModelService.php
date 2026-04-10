<?php

namespace App\Services;

use App\Models\MachineModelModel;
use App\Models\ModelLayerModel;
use App\Models\PartGeometryModel;
use CodeIgniter\Files\File;

class ModelService
{
    protected $machineModelModel;
    protected $modelLayerModel;
    protected $partGeometryModel;

    public function __construct()
    {
        $this->machineModelModel = new MachineModelModel();
        $this->modelLayerModel = new ModelLayerModel();
        $this->partGeometryModel = new PartGeometryModel();
    }

    public function uploadModel(int $machineId, File $file, int $uploaderId): array
    {
        $modelType = $this->detectModelType($file->getExtension());
        $modelId = $this->generateUUID();
        
        // Create directory structure
        $modelDir = WRITEPATH . "models/{$machineId}/{$modelId}";
        if (!is_dir($modelDir)) {
            mkdir($modelDir, 0755, true);
        }

        // Move file
        $fileName = $file->getRandomName();
        $filePath = $modelDir . '/' . $fileName;
        $file->move($modelDir, $fileName);

        // Create database record
        $data = [
            'id' => $modelId,
            'machine_id' => $machineId,
            'model_type' => $modelType,
            'file_path' => $filePath,
            'file_size' => filesize($filePath),
            'uploader_id' => $uploaderId,
            'status' => 'uploaded'
        ];

        $this->machineModelModel->insert($data);

        return [
            'model_id' => $modelId,
            'file_path' => $filePath,
            'model_type' => $modelType
        ];
    }

    public function getModelsByMachine(int $machineId): array
    {
        return $this->machineModelModel->where('machine_id', $machineId)->findAll();
    }

    public function getModel(string $modelId): ?array
    {
        return $this->machineModelModel->find($modelId);
    }

    public function deleteModel(string $modelId): bool
    {
        $model = $this->getModel($modelId);
        if (!$model) return false;

        // Delete files
        if (file_exists($model['file_path'])) {
            unlink($model['file_path']);
        }
        if ($model['optimized_file_path'] && file_exists($model['optimized_file_path'])) {
            unlink($model['optimized_file_path']);
        }
        if ($model['thumbnail_path'] && file_exists($model['thumbnail_path'])) {
            unlink($model['thumbnail_path']);
        }

        return $this->machineModelModel->delete($modelId);
    }

    public function updateProcessingStatus(string $modelId, string $status, ?string $optimizedPath = null, ?string $thumbnailPath = null): bool
    {
        $data = ['status' => $status];
        
        if ($optimizedPath) {
            $data['optimized_file_path'] = $optimizedPath;
        }
        if ($thumbnailPath) {
            $data['thumbnail_path'] = $thumbnailPath;
        }

        return $this->machineModelModel->update($modelId, $data);
    }

    public function extractMeshNames(string $filePath): array
    {
        // For GLB/GLTF files, we would use a Node.js script
        // For now, return mock data
        return [
            'Engine_Block',
            'Cylinder_Head',
            'Piston_Assembly',
            'Crankshaft',
            'Camshaft'
        ];
    }

    private function detectModelType(string $extension): string
    {
        return match(strtolower($extension)) {
            'glb' => 'glb',
            'gltf' => 'gltf',
            'svg' => 'svg',
            default => 'glb'
        };
    }

    private function generateUUID(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}