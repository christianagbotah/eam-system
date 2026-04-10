<?php

namespace App\Repositories;

class AssetRepository
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function create($type, $data)
    {
        $table = $this->getTableName($type);
        $builder = $this->db->table($table);
        $builder->insert($data);
        return $this->db->insertID();
    }

    public function exists($type, $id)
    {
        $table = $this->getTableName($type);
        return $this->db->table($table)->where('id', $id)->countAllResults() > 0;
    }

    public function parentExists($type, $parentId)
    {
        $parentType = $this->getParentType($type);
        return $this->exists($parentType, $parentId);
    }

    public function codeExists($type, $code, $excludeId = null)
    {
        $table = $this->getTableName($type);
        $builder = $this->db->table($table)->where('code', $code);
        if ($excludeId) $builder->where('id !=', $excludeId);
        return $builder->countAllResults() > 0;
    }

    public function buildHierarchyTree($facilityId = null)
    {
        // SELECT * FROM facilities WHERE id = ? OR ? IS NULL
        $facilities = $this->db->table('facilities')
            ->where($facilityId ? ['id' => $facilityId] : '1=1')
            ->get()->getResultArray();

        foreach ($facilities as &$facility) {
            $facility['systems'] = $this->getSystemsByFacility($facility['id']);
        }

        return $facilities;
    }

    public function updateParent($type, $assetId, $newParentId)
    {
        $table = $this->getTableName($type);
        $parentField = $this->getParentField($type);
        
        // UPDATE {type}s SET {parent}_id = ? WHERE id = ?
        $this->db->table($table)->where('id', $assetId)->update([$parentField => $newParentId]);
    }

    public function isDescendant($type, $assetId, $potentialParentId)
    {
        // Recursive check to prevent circular references
        // Implementation depends on hierarchy depth
        return false; // TODO: Implement recursive descendant check
    }

    private function getSystemsByFacility($facilityId)
    {
        $systems = $this->db->table('systems')->where('facility_id', $facilityId)->get()->getResultArray();
        foreach ($systems as &$system) {
            $system['equipment'] = $this->getEquipmentBySystem($system['id']);
        }
        return $systems;
    }

    private function getEquipmentBySystem($systemId)
    {
        $equipment = $this->db->table('equipment')->where('system_id', $systemId)->get()->getResultArray();
        foreach ($equipment as &$eq) {
            $eq['assemblies'] = $this->getAssembliesByEquipment($eq['id']);
        }
        return $equipment;
    }

    private function getAssembliesByEquipment($equipmentId)
    {
        $assemblies = $this->db->table('assemblies')->where('equipment_id', $equipmentId)->get()->getResultArray();
        foreach ($assemblies as &$assembly) {
            $assembly['components'] = $this->getComponentsByAssembly($assembly['id']);
        }
        return $assemblies;
    }

    private function getComponentsByAssembly($assemblyId)
    {
        $components = $this->db->table('components')->where('assembly_id', $assemblyId)->get()->getResultArray();
        foreach ($components as &$component) {
            $component['parts'] = $this->getPartsByComponent($component['id']);
        }
        return $components;
    }

    private function getPartsByComponent($componentId)
    {
        return $this->db->table('parts')->where('component_id', $componentId)->get()->getResultArray();
    }

    private function getTableName($type)
    {
        $map = [
            'facility' => 'facilities',
            'system' => 'systems',
            'equipment' => 'equipment',
            'assembly' => 'assemblies',
            'component' => 'components',
            'part' => 'parts',
            'sub_part' => 'sub_parts'
        ];
        return $map[$type];
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
        return $map[$type];
    }
}
