<?php

namespace App\Controllers\Api\V1\Modules\MPMP;

use App\Controllers\Api\V1\BaseApiController;

class QualityController extends BaseApiController
{
    protected $format = 'json';

    public function getNonConformances()
    {
        // Permission check
        if (!$this->checkPermission('production', 'view')) {
            return $this->failForbidden('Insufficient permissions to view non-conformances');
        }

        $db = \Config\Database::connect();

        $query = "SELECT
            nc.*,
            a.name as asset_name,
            u.username as reported_by
        FROM non_conformances nc
        LEFT JOIN assets a ON nc.asset_id = a.id
        LEFT JOIN users u ON nc.reported_by = u.id
        ORDER BY nc.created_at DESC";

        $nonConformances = $db->query($query)->getResultArray();

        // Audit log
        $this->auditLog('VIEW', 'non_conformances', 0, null, ['count' => count($nonConformances)]);

        return $this->respond(['status' => 'success', 'data' => $nonConformances]);
    }

    public function createNonConformance()
    {
        // Permission check
        if (!$this->checkPermission('production', 'create')) {
            return $this->failForbidden('Insufficient permissions to create non-conformances');
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $ncNumber = 'NC-' . date('Y') . '-' . str_pad($db->table('non_conformances')->countAll() + 1, 3, '0', STR_PAD_LEFT);

        $insertData = [
            'nc_number' => $ncNumber,
            'title' => $data['title'],
            'description' => $data['description'],
            'severity' => $data['severity'],
            'asset_id' => $data['asset_id'] ?? null,
            'root_cause' => $data['root_cause'] ?? null,
            'corrective_action' => $data['corrective_action'] ?? null,
            'reported_by' => 1,
            'status' => 'open'
        ];

        $db->table('non_conformances')->insert($insertData);

        // Audit log
        $this->auditLog('CREATE', 'non_conformances', $db->insertID(), null, $insertData);

        return $this->respondCreated(['status' => 'success', 'message' => 'Non-conformance reported', 'nc_number' => $ncNumber]);
    }

    public function updateNonConformance($id = null)
    {
        // Permission check
        if (!$this->checkPermission('production', 'update')) {
            return $this->failForbidden('Insufficient permissions to update non-conformances');
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $db->table('non_conformances')->update($data, ['id' => $id]);

        // Audit log
        $this->auditLog('UPDATE', 'non_conformances', $id, null, $data);

        return $this->respond(['status' => 'success', 'message' => 'Non-conformance updated']);
    }

    public function getChecklists()
    {
        // Permission check
        if (!$this->checkPermission('production', 'view')) {
            return $this->failForbidden('Insufficient permissions to view inspection checklists');
        }

        $db = \Config\Database::connect();
        $checklists = $db->table('inspection_checklists')->where('is_active', true)->get()->getResultArray();

        // Audit log
        $this->auditLog('VIEW', 'inspection_checklists', 0, null, ['count' => count($checklists)]);

        return $this->respond(['status' => 'success', 'data' => $checklists]);
    }

    public function createChecklist()
    {
        // Permission check
        if (!$this->checkPermission('production', 'create')) {
            return $this->failForbidden('Insufficient permissions to create inspection checklists');
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $insertData = [
            'name' => $data['name'],
            'asset_type' => $data['asset_type'] ?? null,
            'frequency' => $data['frequency'],
            'checklist_items' => json_encode($data['checklist_items']),
            'is_active' => true
        ];

        $db->table('inspection_checklists')->insert($insertData);

        // Audit log
        $this->auditLog('CREATE', 'inspection_checklists', $db->insertID(), null, $insertData);

        return $this->respondCreated(['status' => 'success', 'message' => 'Checklist created']);
    }

    public function submitInspection()
    {
        // Permission check
        if (!$this->checkPermission('production', 'create')) {
            return $this->failForbidden('Insufficient permissions to submit inspections');
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $insertData = [
            'checklist_id' => $data['checklist_id'],
            'asset_id' => $data['asset_id'],
            'inspector_id' => 1,
            'results' => json_encode($data['results']),
            'pass_fail' => $data['pass_fail'],
            'notes' => $data['notes'] ?? null,
            'inspection_date' => date('Y-m-d H:i:s')
        ];

        $db->table('inspection_results')->insert($insertData);

        if ($data['pass_fail'] === 'fail') {
            $ncNumber = 'NC-' . date('Y') . '-' . str_pad($db->table('non_conformances')->countAll() + 1, 3, '0', STR_PAD_LEFT);

            $ncData = [
                'nc_number' => $ncNumber,
                'title' => 'Inspection Failed: ' . $data['checklist_name'],
                'description' => $data['notes'] ?? 'Inspection failed',
                'severity' => 'major',
                'asset_id' => $data['asset_id'],
                'reported_by' => 1,
                'status' => 'open'
            ];

            $db->table('non_conformances')->insert($ncData);
        }

        // Audit log
        $this->auditLog('CREATE', 'inspection_results', $db->insertID(), null, $insertData);

        return $this->respondCreated(['status' => 'success', 'message' => 'Inspection submitted']);
    }

    public function createCAPAAction()
    {
        // Permission check
        if (!$this->checkPermission('production', 'create')) {
            return $this->failForbidden('Insufficient permissions to create CAPA actions');
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $insertData = [
            'nc_id' => $data['nc_id'],
            'action_type' => $data['action_type'],
            'description' => $data['description'],
            'responsible_person' => $data['responsible_person'],
            'due_date' => $data['due_date'],
            'status' => 'planned'
        ];

        $db->table('capa_actions')->insert($insertData);

        // Audit log
        $this->auditLog('CREATE', 'capa_actions', $db->insertID(), null, $insertData);

        return $this->respondCreated(['status' => 'success', 'message' => 'CAPA action created']);
    }

    public function getMetrics()
    {
        // Permission check
        if (!$this->checkPermission('production', 'view')) {
            return $this->failForbidden('Insufficient permissions to view quality metrics');
        }

        $db = \Config\Database::connect();

        $totalNC = $db->table('non_conformances')->countAll();
        $openNC = $db->table('non_conformances')->where('status', 'open')->countAll();
        $criticalNC = $db->table('non_conformances')->where('severity', 'critical')->countAll();

        $query = "SELECT
            COUNT(*) as total_inspections,
            SUM(CASE WHEN pass_fail = 'pass' THEN 1 ELSE 0 END) as passed,
            SUM(CASE WHEN pass_fail = 'fail' THEN 1 ELSE 0 END) as failed
        FROM inspection_results
        WHERE inspection_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)";

        $inspectionStats = $db->query($query)->getRow();

        $metrics = [
            'total_nc' => $totalNC,
            'open_nc' => $openNC,
            'critical_nc' => $criticalNC,
            'inspection_stats' => $inspectionStats
        ];

        // Audit log
        $this->auditLog('VIEW', 'quality_metrics', 0, null, $metrics);

        return $this->respond([
            'status' => 'success',
            'data' => $metrics
        ]);
    }
}
