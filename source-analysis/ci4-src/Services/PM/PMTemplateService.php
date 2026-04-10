<?php

namespace App\Services\PM;

use CodeIgniter\Database\Exceptions\DatabaseException;

class PMTemplateService
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function create(array $payload): array
    {
        return $this->createTemplate($payload);
    }

    public function createTemplate(array $payload): array
    {
        try {
            // Simple template creation without complex relationships
            $templateData = [
                'code' => $this->generateTemplateCode(),
                'title' => $payload['title'],
                'description' => $payload['description'] ?? '',
                'asset_node_type' => $payload['asset_node_type'],
                'asset_node_id' => $payload['asset_node_id'],
                'maintenance_type' => $payload['maintenance_type'],
                'priority' => $payload['priority'],
                'estimated_hours' => $payload['estimated_hours'],
                'active' => $payload['active'] ?? true
            ];

            $this->db->table('pm_templates')->insert($templateData);
            $templateId = $this->db->insertID();

            return ['success' => true, 'id' => $templateId];

        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function updateTemplate(int $id, array $payload): array
    {
        $template = $this->db->table('pm_templates')->where('id', $id)->get()->getRowArray();
        if (!$template) {
            throw new \Exception('PM Template not found');
        }

        $this->db->transStart();

        try {
            $this->db->table('pm_templates')->where('id', $id)->update($payload);

            if (isset($payload['triggers'])) {
                $this->db->table('pm_triggers')->where('pm_template_id', $id)->delete();
                foreach ($payload['triggers'] as $trigger) {
                    $trigger['pm_template_id'] = $id;
                    $this->db->table('pm_triggers')->insert($trigger);
                }
            }

            $this->db->transComplete();
            return ['success' => true];

        } catch (\Exception $e) {
            $this->db->transRollback();
            throw $e;
        }
    }

    public function getById(int $id): array
    {
        $template = $this->getTemplate($id);
        return $template ? ['success' => true, 'data' => $template] : ['success' => false, 'error' => 'Template not found'];
    }

    public function getTemplate(int $id): ?array
    {
        $template = $this->db->table('pm_templates')->where('id', $id)->get()->getRowArray();
        if (!$template) {
            return null;
        }

        $template['triggers'] = $this->db->table('pm_triggers')->where('pm_template_id', $id)->get()->getResultArray();

        $checklists = $this->db->table('pm_checklists')->where('pm_template_id', $id)->orderBy('sequence')->get()->getResultArray();
        foreach ($checklists as &$checklist) {
            $checklist['items'] = $this->db->table('pm_checklist_items')
                ->where('pm_checklist_id', $checklist['id'])
                ->orderBy('sequence')
                ->get()->getResultArray();
        }
        $template['checklists'] = $checklists;

        return $template;
    }

    public function listTemplates(array $filters = []): array
    {
        $builder = $this->db->table('pm_templates');

        if (!empty($filters['active'])) {
            $builder->where('active', $filters['active']);
        }
        if (!empty($filters['asset_node_type'])) {
            $builder->where('asset_node_type', $filters['asset_node_type']);
        }
        if (!empty($filters['maintenance_type'])) {
            $builder->where('maintenance_type', $filters['maintenance_type']);
        }
        if (!empty($filters['priority'])) {
            $builder->where('priority', $filters['priority']);
        }

        return $builder->orderBy('created_at', 'DESC')->get()->getResultArray();
    }

    private function generateTemplateCode(): string
    {
        $year = date('Y');
        $lastTemplate = $this->db->table('pm_templates')
            ->where('code LIKE', "EAM-PM-{$year}%")
            ->orderBy('code', 'DESC')
            ->get()->getRowArray();

        if ($lastTemplate) {
            $lastNumber = (int) substr($lastTemplate['code'], -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return 'EAM-PM-' . $year . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }
}