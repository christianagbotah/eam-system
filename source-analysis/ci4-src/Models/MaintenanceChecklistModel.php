<?php

namespace App\Models;

use CodeIgniter\Model;

class MaintenanceChecklistModel extends Model
{
    protected $table = 'maintenance_checklist_templates';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = ['name', 'description', 'part_category_id', 'frequency'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getTemplateWithItems($templateId)
    {
        return $this->db->query("
            SELECT t.*, 
                   GROUP_CONCAT(
                       CONCAT(i.id, '|', i.item_name, '|', i.measurement_type, '|', 
                              COALESCE(i.measurement_unit, ''), '|', 
                              COALESCE(i.normal_range_min, ''), '|', COALESCE(i.normal_range_max, ''), '|',
                              COALESCE(i.warning_range_min, ''), '|', COALESCE(i.warning_range_max, ''), '|',
                              COALESCE(i.critical_range_min, ''), '|', COALESCE(i.critical_range_max, ''), '|',
                              COALESCE(i.instructions, ''))
                       ORDER BY i.sort_order SEPARATOR '||'
                   ) as items
            FROM maintenance_checklist_templates t
            LEFT JOIN maintenance_checklist_items i ON t.id = i.template_id
            WHERE t.id = ?
            GROUP BY t.id
        ", [$templateId])->getRowArray();
    }

    public function getTemplatesByCategoryId($categoryId)
    {
        return $this->where('part_category_id', $categoryId)->findAll();
    }

    public function getTemplatesForPart($partId)
    {
        return $this->db->query("
            SELECT t.*, pct.is_active
            FROM maintenance_checklist_templates t
            JOIN part_checklist_templates pct ON t.id = pct.template_id
            WHERE pct.part_id = ? AND pct.is_active = 1
        ", [$partId])->getResultArray();
    }

    public function getExecutionHistory($partId, $limit = 10)
    {
        return $this->db->query("
            SELECT e.*, t.name as template_name, u.first_name, u.last_name,
                   COUNT(r.id) as total_items,
                   SUM(CASE WHEN r.status = 'pass' THEN 1 ELSE 0 END) as passed_items,
                   SUM(CASE WHEN r.status = 'warning' THEN 1 ELSE 0 END) as warning_items,
                   SUM(CASE WHEN r.status = 'fail' THEN 1 ELSE 0 END) as failed_items
            FROM maintenance_checklist_executions e
            JOIN maintenance_checklist_templates t ON e.template_id = t.id
            JOIN users u ON e.technician_id = u.id
            LEFT JOIN maintenance_checklist_results r ON e.id = r.execution_id
            WHERE e.part_id = ?
            GROUP BY e.id
            ORDER BY e.execution_date DESC
            LIMIT ?
        ", [$partId, $limit])->getResultArray();
    }
}