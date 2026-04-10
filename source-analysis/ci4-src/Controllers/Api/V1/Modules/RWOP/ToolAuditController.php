<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class ToolAuditController extends ResourceController
{
    use ResponseTrait;

    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    // GET /api/v1/eam/tool-audit/logs
    public function logs()
    {
        try {
            $toolId = $this->request->getGet('tool_id');
            $action = $this->request->getGet('action');
            $plantId = $this->request->getGet('plant_id') ?? 1;
            $limit = $this->request->getGet('limit') ?? 100;
            
            $builder = $this->db->table('tool_audit_logs tal');
            $builder->select('tal.*, t.name as tool_name, t.code as tool_code, u.username');
            $builder->join('tools t', 't.id = tal.tool_id', 'left');
            $builder->join('users u', 'u.id = tal.user_id', 'left');
            $builder->where('tal.plant_id', $plantId);
            
            if ($toolId) $builder->where('tal.tool_id', $toolId);
            if ($action) $builder->where('tal.action', $action);
            
            $builder->orderBy('tal.created_at', 'DESC');
            $builder->limit($limit);
            
            $result = $builder->get()->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching audit logs: ' . $e->getMessage());
        }
    }

    // POST /api/v1/eam/tool-audit/log
    public function createLog()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $logData = [
                'tool_id' => $data['tool_id'],
                'action' => $data['action'],
                'old_values' => isset($data['old_values']) ? json_encode($data['old_values']) : null,
                'new_values' => isset($data['new_values']) ? json_encode($data['new_values']) : null,
                'user_id' => session('user_id'),
                'ip_address' => $this->request->getIPAddress(),
                'user_agent' => $this->request->getUserAgent()->getAgentString(),
                'plant_id' => $data['plant_id'] ?? 1
            ];

            $this->db->table('tool_audit_logs')->insert($logData);

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Audit log created'
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error creating audit log: ' . $e->getMessage());
        }
    }

    // GET /api/v1/eam/tool-audit/compliance
    public function compliance()
    {
        try {
            $plantId = $this->request->getGet('plant_id') ?? 1;
            $status = $this->request->getGet('status');
            
            $builder = $this->db->table('tool_compliance tc');
            $builder->select('tc.*, t.name as tool_name, t.code as tool_code, 
                             cr.name as requirement_name, cr.regulation_type,
                             u.username as checked_by_name');
            $builder->join('tools t', 't.id = tc.tool_id');
            $builder->join('compliance_requirements cr', 'cr.id = tc.requirement_id');
            $builder->join('users u', 'u.id = tc.checked_by', 'left');
            $builder->where('t.plant_id', $plantId);
            
            if ($status) $builder->where('tc.status', $status);
            
            $builder->orderBy('tc.next_due_date', 'ASC');
            
            $result = $builder->get()->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching compliance data: ' . $e->getMessage());
        }
    }

    // POST /api/v1/eam/tool-audit/compliance-check
    public function complianceCheck()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $validation = \Config\Services::validation();
            $validation->setRules([
                'tool_id' => 'required|integer',
                'requirement_id' => 'required|integer',
                'status' => 'required|in_list[COMPLIANT,NON_COMPLIANT]'
            ]);

            if (!$validation->run($data)) {
                return $this->fail($validation->getErrors());
            }

            // Get requirement frequency
            $requirement = $this->db->table('compliance_requirements')
                ->where('id', $data['requirement_id'])
                ->get()->getRowArray();

            if (!$requirement) {
                return $this->fail('Requirement not found');
            }

            $nextDueDate = date('Y-m-d', strtotime("+{$requirement['frequency_days']} days"));

            $complianceData = [
                'tool_id' => $data['tool_id'],
                'requirement_id' => $data['requirement_id'],
                'last_check_date' => date('Y-m-d'),
                'next_due_date' => $nextDueDate,
                'status' => $data['status'],
                'checked_by' => session('user_id'),
                'notes' => $data['notes'] ?? null,
                'evidence_file' => $data['evidence_file'] ?? null
            ];

            // Update or insert compliance record
            $existing = $this->db->table('tool_compliance')
                ->where('tool_id', $data['tool_id'])
                ->where('requirement_id', $data['requirement_id'])
                ->get()->getRowArray();

            if ($existing) {
                $this->db->table('tool_compliance')
                    ->where('id', $existing['id'])
                    ->update($complianceData);
            } else {
                $this->db->table('tool_compliance')->insert($complianceData);
            }

            // Create audit log
            $this->createAuditLog($data['tool_id'], 'COMPLIANCE_CHECK', null, $complianceData);

            return $this->respond([
                'status' => 'success',
                'message' => 'Compliance check recorded'
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error recording compliance check: ' . $e->getMessage());
        }
    }

    // GET /api/v1/eam/tool-audit/requirements
    public function requirements()
    {
        try {
            $plantId = $this->request->getGet('plant_id') ?? 1;
            
            $requirements = $this->db->table('compliance_requirements')
                ->where('plant_id', $plantId)
                ->orderBy('name')
                ->get()->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $requirements
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching requirements: ' . $e->getMessage());
        }
    }

    // POST /api/v1/eam/tool-audit/generate-report
    public function generateReport()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $validation = \Config\Services::validation();
            $validation->setRules([
                'report_type' => 'required|in_list[USAGE,COMPLIANCE,MAINTENANCE,SECURITY]',
                'date_from' => 'required|valid_date',
                'date_to' => 'required|valid_date'
            ]);

            if (!$validation->run($data)) {
                return $this->fail($validation->getErrors());
            }

            $reportData = [
                'report_name' => $data['report_name'] ?? $data['report_type'] . ' Report',
                'report_type' => $data['report_type'],
                'date_from' => $data['date_from'],
                'date_to' => $data['date_to'],
                'generated_by' => session('user_id'),
                'plant_id' => $data['plant_id'] ?? 1,
                'status' => 'GENERATING'
            ];

            $reportId = $this->db->table('audit_reports')->insert($reportData);
            
            // Generate report data based on type
            $reportContent = $this->generateReportContent($data['report_type'], $data['date_from'], $data['date_to'], $data['plant_id'] ?? 1);
            
            // Update report status
            $this->db->table('audit_reports')
                ->where('id', $this->db->insertID())
                ->update(['status' => 'COMPLETED']);

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Report generated successfully',
                'report_id' => $this->db->insertID(),
                'data' => $reportContent
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error generating report: ' . $e->getMessage());
        }
    }

    private function generateReportContent($type, $dateFrom, $dateTo, $plantId)
    {
        switch ($type) {
            case 'USAGE':
                return $this->generateUsageReport($dateFrom, $dateTo, $plantId);
            case 'COMPLIANCE':
                return $this->generateComplianceReport($dateFrom, $dateTo, $plantId);
            case 'MAINTENANCE':
                return $this->generateMaintenanceReport($dateFrom, $dateTo, $plantId);
            case 'SECURITY':
                return $this->generateSecurityReport($dateFrom, $dateTo, $plantId);
            default:
                return [];
        }
    }

    private function generateUsageReport($dateFrom, $dateTo, $plantId)
    {
        return $this->db->query("
            SELECT t.name, t.code, COUNT(tr.id) as usage_count,
                   AVG(DATEDIFF(COALESCE(tr.actual_return_date, tr.expected_return_date), tr.issued_date)) as avg_usage_days
            FROM tools t
            LEFT JOIN tool_requests tr ON tr.tool_id = t.id 
                AND tr.issued_date BETWEEN ? AND ?
            WHERE t.plant_id = ?
            GROUP BY t.id
            ORDER BY usage_count DESC
        ", [$dateFrom, $dateTo, $plantId])->getResultArray();
    }

    private function generateComplianceReport($dateFrom, $dateTo, $plantId)
    {
        return $this->db->query("
            SELECT t.name, t.code, cr.name as requirement, tc.status,
                   tc.last_check_date, tc.next_due_date
            FROM tool_compliance tc
            JOIN tools t ON t.id = tc.tool_id
            JOIN compliance_requirements cr ON cr.id = tc.requirement_id
            WHERE t.plant_id = ? AND tc.last_check_date BETWEEN ? AND ?
            ORDER BY tc.next_due_date
        ", [$plantId, $dateFrom, $dateTo])->getResultArray();
    }

    private function generateMaintenanceReport($dateFrom, $dateTo, $plantId)
    {
        return $this->db->query("
            SELECT t.name, t.code, tmr.maintenance_type, tmr.cost,
                   tmr.completed_date, tmr.notes
            FROM tool_maintenance_records tmr
            JOIN tools t ON t.id = tmr.tool_id
            WHERE t.plant_id = ? AND tmr.completed_date BETWEEN ? AND ?
            ORDER BY tmr.completed_date DESC
        ", [$plantId, $dateFrom, $dateTo])->getResultArray();
    }

    private function generateSecurityReport($dateFrom, $dateTo, $plantId)
    {
        return $this->db->query("
            SELECT tal.action, t.name, t.code, u.username, tal.ip_address,
                   tal.created_at
            FROM tool_audit_logs tal
            JOIN tools t ON t.id = tal.tool_id
            LEFT JOIN users u ON u.id = tal.user_id
            WHERE tal.plant_id = ? AND tal.created_at BETWEEN ? AND ?
            ORDER BY tal.created_at DESC
        ", [$plantId, $dateFrom, $dateTo])->getResultArray();
    }

    private function createAuditLog($toolId, $action, $oldValues = null, $newValues = null)
    {
        $logData = [
            'tool_id' => $toolId,
            'action' => $action,
            'old_values' => $oldValues ? json_encode($oldValues) : null,
            'new_values' => $newValues ? json_encode($newValues) : null,
            'user_id' => session('user_id'),
            'ip_address' => $this->request->getIPAddress(),
            'user_agent' => $this->request->getUserAgent()->getAgentString(),
            'plant_id' => 1
        ];

        $this->db->table('tool_audit_logs')->insert($logData);
    }
}