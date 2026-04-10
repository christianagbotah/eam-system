<?php

namespace App\Models;

use CodeIgniter\Model;

class PmTemplateModel extends Model
{
    protected $table = 'pm_templates';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'pm_code', 'pm_title', 'asset_node_id', 'maintenance_type', 'priority',
        'estimated_duration', 'technician_group', 'required_tools', 'safety_instructions', 'status'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'pm_title' => 'required|min_length[3]',
        'asset_node_id' => 'required|is_natural_no_zero',
        'maintenance_type' => 'required|in_list[pm,lubrication,inspection,calibration,cleaning]',
        'priority' => 'required|in_list[low,medium,high,critical]',
    ];

    public function getWithDetails($id)
    {
        $template = $this->find($id);
        if (!$template) return null;

        $db = \Config\Database::connect();
        
        $template['triggers'] = $db->table('pm_triggers')->where('pm_template_id', $id)->get()->getResultArray();
        $template['checklists'] = $db->table('pm_checklists')->where('pm_template_id', $id)->get()->getResultArray();
        
        foreach ($template['checklists'] as &$checklist) {
            $checklist['items'] = $db->table('pm_checklist_items')
                ->where('pm_checklist_id', $checklist['id'])
                ->orderBy('sort_order', 'ASC')
                ->get()
                ->getResultArray();
        }
        
        $template['required_spares'] = $db->table('pm_required_spares')->where('pm_template_id', $id)->get()->getResultArray();
        
        return $template;
    }
}
