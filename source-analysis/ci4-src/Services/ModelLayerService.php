<?php

namespace App\Services;

use App\Models\ModelLayerModel;

class ModelLayerService
{
    protected $layerModel;

    public function __construct()
    {
        $this->layerModel = new ModelLayerModel();
    }

    public function createLayer(array $data): string
    {
        $layerId = $this->generateUUID();
        $data['id'] = $layerId;
        
        $this->layerModel->insert($data);
        return $layerId;
    }

    public function getLayersByModel(string $modelId): array
    {
        return $this->layerModel
            ->where('model_id', $modelId)
            ->orderBy('order_index', 'ASC')
            ->findAll();
    }

    public function updateLayerVisibility(string $modelId, array $layerVisibility): bool
    {
        foreach ($layerVisibility as $layerName => $visible) {
            $this->layerModel
                ->where('model_id', $modelId)
                ->where('name', $layerName)
                ->set(['visible_default' => $visible])
                ->update();
        }
        return true;
    }

    public function createDefaultLayers(string $modelId): array
    {
        $defaultLayers = [
            ['name' => 'Structure', 'order_index' => 1, 'visible_default' => true],
            ['name' => 'Mechanical', 'order_index' => 2, 'visible_default' => true],
            ['name' => 'Electrical', 'order_index' => 3, 'visible_default' => false],
            ['name' => 'Hydraulic', 'order_index' => 4, 'visible_default' => false],
            ['name' => 'Safety', 'order_index' => 5, 'visible_default' => true],
        ];

        $created = [];
        foreach ($defaultLayers as $layer) {
            $layer['model_id'] = $modelId;
            $created[] = $this->createLayer($layer);
        }

        return $created;
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