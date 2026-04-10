<?php

namespace App\Services;

use App\Models\PartGeometryModel;
use App\Models\PartsModel;

class ModelPartMappingService
{
    protected $partGeometryModel;
    protected $partsModel;

    public function __construct()
    {
        $this->partGeometryModel = new PartGeometryModel();
        $this->partsModel = new PartsModel();
    }

    public function mapMeshToPart(string $modelId, string $meshName, int $partId, float $confidence = 1.0): string
    {
        $mappingId = $this->generateUUID();
        
        $data = [
            'id' => $mappingId,
            'part_id' => $partId,
            'model_id' => $modelId,
            'mesh_name' => $meshName,
            'mapping_confidence' => $confidence
        ];

        $this->partGeometryModel->insert($data);
        return $mappingId;
    }

    public function autoMapMeshesToParts(string $modelId, array $meshNames): array
    {
        $mappings = [];
        $parts = $this->partsModel->findAll();

        foreach ($meshNames as $meshName) {
            $bestMatch = $this->findBestPartMatch($meshName, $parts);
            
            if ($bestMatch) {
                $mappings[] = $this->mapMeshToPart(
                    $modelId,
                    $meshName,
                    $bestMatch['part']['id'],
                    $bestMatch['confidence']
                );
            }
        }

        return $mappings;
    }

    public function getMappingsByModel(string $modelId): array
    {
        return $this->partGeometryModel
            ->select('part_geometry.*, parts.name as part_name, parts.code as part_code')
            ->join('parts', 'parts.id = part_geometry.part_id')
            ->where('part_geometry.model_id', $modelId)
            ->findAll();
    }

    public function updateMapping(string $mappingId, array $data): bool
    {
        return $this->partGeometryModel->update($mappingId, $data);
    }

    public function deleteMapping(string $mappingId): bool
    {
        return $this->partGeometryModel->delete($mappingId);
    }

    private function findBestPartMatch(string $meshName, array $parts): ?array
    {
        $bestMatch = null;
        $highestConfidence = 0;

        foreach ($parts as $part) {
            $confidence = $this->calculateMatchConfidence($meshName, $part);
            
            if ($confidence > $highestConfidence && $confidence >= 0.5) {
                $highestConfidence = $confidence;
                $bestMatch = [
                    'part' => $part,
                    'confidence' => $confidence
                ];
            }
        }

        return $bestMatch;
    }

    private function calculateMatchConfidence(string $meshName, array $part): float
    {
        $meshName = strtolower($meshName);
        $partName = strtolower($part['name']);
        $partCode = strtolower($part['code'] ?? '');

        // Exact match
        if ($meshName === $partName || $meshName === $partCode) {
            return 1.0;
        }

        // Contains match
        if (strpos($meshName, $partName) !== false || strpos($partName, $meshName) !== false) {
            return 0.8;
        }

        if (strpos($meshName, $partCode) !== false || strpos($partCode, $meshName) !== false) {
            return 0.8;
        }

        // Word similarity
        $meshWords = explode('_', str_replace(['-', ' '], '_', $meshName));
        $partWords = explode('_', str_replace(['-', ' '], '_', $partName));

        $commonWords = array_intersect($meshWords, $partWords);
        if (count($commonWords) > 0) {
            return 0.6;
        }

        return 0.0;
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