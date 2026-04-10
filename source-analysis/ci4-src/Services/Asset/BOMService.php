<?php

namespace App\Services\Asset;

use App\Models\BomEntryModel;
use CodeIgniter\Files\File;

class BOMService
{
    protected $bomModel;

    public function __construct()
    {
        $this->bomModel = new BomEntryModel();
    }

    public function getBOMEntries($machineId = null)
    {
        $query = $this->bomModel
            ->select('bom_entries.*, machines.machine_name, assemblies.assembly_name, parts.part_name')
            ->join('machines', 'machines.id = bom_entries.machine_id', 'left')
            ->join('assemblies', 'assemblies.id = bom_entries.assembly_id', 'left')
            ->join('parts', 'parts.id = bom_entries.part_id', 'left');
            
        if ($machineId) {
            $query->where('bom_entries.machine_id', $machineId);
        }
        
        return $query->findAll();
    }

    public function createBOMEntry($data)
    {
        return $this->bomModel->insert($data);
    }

    public function importFromCSV($file, $machineId)
    {
        if (!$file->isValid()) {
            throw new \Exception('Invalid file');
        }

        $csvData = array_map('str_getcsv', file($file->getTempName()));
        $header = array_shift($csvData);
        
        $imported = 0;
        foreach ($csvData as $row) {
            $data = array_combine($header, $row);
            $data['machine_id'] = $machineId;
            
            if ($this->bomModel->insert($data)) {
                $imported++;
            }
        }

        return $imported;
    }

    public function exportToCSV($machineId)
    {
        $bomEntries = $this->getBOMEntries($machineId);
        
        $csvData = [];
        $csvData[] = ['Machine', 'Assembly', 'Part', 'Quantity', 'Unit', 'Reference Location'];
        
        foreach ($bomEntries as $entry) {
            $csvData[] = [
                $entry['machine_name'],
                $entry['assembly_name'],
                $entry['part_name'],
                $entry['qty'],
                $entry['unit'],
                $entry['reference_location']
            ];
        }

        return $csvData;
    }
}