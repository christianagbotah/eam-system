<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\PartsModel;
use App\Models\MaintenanceChecklistModel;
use App\Models\PartsCategoryModel;

class Checklist extends BaseController
{
    protected $partsModel;
    protected $checklistModel;
    protected $partsCategoryModel;

    public function __construct()
    {
        $this->partsModel = new PartsModel();
        $this->checklistModel = new MaintenanceChecklistModel();
        $this->partsCategoryModel = new PartsCategoryModel();
        
        helper(['form', 'url']);
        
        if (!session()->get('isLoggedIn')) {
            return redirect()->to('/auth/login');
        }
    }

    public function index($partId)
    {
        $part = $this->partsModel->find($partId);
        if (!$part) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Part not found');
        }

        // Get checklist templates - first check for part-specific templates
        $templates = $this->checklistModel->getTemplatesForPart($partId);
        
        if (empty($templates)) {
            // Fall back to category-based templates
            $categoryId = $part['category'] ?? $part['category_id'] ?? null;
            if ($categoryId) {
                $templates = $this->checklistModel->getTemplatesByCategoryId($categoryId);
            }
            
            if (empty($templates)) {
                // Use generic template if no specific category template exists
                $generalCategory = $this->partsCategoryModel->where('name', 'general')->first();
                if ($generalCategory) {
                    $templates = $this->checklistModel->getTemplatesByCategoryId($generalCategory['id']);
                }
            }
        }

        if (empty($templates)) {
            session()->setFlashdata('error', 'No checklist template found for this part category.');
            return redirect()->to('/parts/show/' . $partId);
        }

        $template = $this->checklistModel->getTemplateWithItems($templates[0]['id']);
        $categoryId = $part['category'] ?? $part['category_id'] ?? null;
        $categoryName = $categoryId ? $this->partsCategoryModel->getPartCategoryById($categoryId)['name'] : 'Unknown';
        
        $data = [
            'title' => 'Part Inspection Checklist',
            'part' => $part,
            'template' => $template,
            'categoryName' => $categoryName,
            'controller' => 'checklist'
        ];

        return view('maintenance/checklist', $data);
    }

    public function submit()
    {
        $partId = $this->request->getPost('part_id');
        $templateId = $this->request->getPost('template_id');
        $items = $this->request->getPost('items');
        $overallNotes = $this->request->getPost('overall_notes');

        // Calculate overall status
        $overallStatus = 'pass';
        foreach ($items as $item) {
            if ($item['status'] === 'fail') {
                $overallStatus = 'fail';
                break;
            } elseif ($item['status'] === 'warning' && $overallStatus !== 'fail') {
                $overallStatus = 'warning';
            }
        }

        // Save execution record
        $executionData = [
            'part_id' => $partId,
            'template_id' => $templateId,
            'technician_id' => session()->get('user_id'),
            'execution_date' => date('Y-m-d H:i:s'),
            'overall_status' => $overallStatus,
            'notes' => $overallNotes,
            'created_at' => date('Y-m-d H:i:s'),
        ];

        $db = \Config\Database::connect();
        $db->table('maintenance_checklist_executions')->insert($executionData);
        $executionId = $db->insertID();

        // Save individual results
        foreach ($items as $itemId => $itemData) {
            $resultData = [
                'execution_id' => $executionId,
                'item_id' => $itemId,
                'measured_value' => $itemData['value'] ?? null,
                'status' => $itemData['status'],
                'notes' => $itemData['notes'] ?? null,
            ];
            $db->table('maintenance_checklist_results')->insert($resultData);
        }

        session()->setFlashdata('success', 'Inspection checklist completed successfully!');
        return redirect()->to('/parts/show/' . $partId);
    }

    public function history($partId)
    {
        $part = $this->partsModel->find($partId);
        if (!$part) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Part not found');
        }

        $history = $this->checklistModel->getExecutionHistory($partId);

        $data = [
            'title' => 'Inspection History',
            'part' => $part,
            'history' => $history,
            'controller' => 'checklist'
        ];

        return view('maintenance/checklist_history', $data);
    }

    public function assignTemplate()
    {
        $partId = $this->request->getPost('part_id');
        $templateId = $this->request->getPost('template_id');
        $customRanges = $this->request->getPost('custom_ranges');
        
        $db = \Config\Database::connect();
        $data = [
            'part_id' => $partId,
            'template_id' => $templateId,
            'is_active' => 1,
            'custom_ranges' => $customRanges ? json_encode($customRanges) : null,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        // Check if assignment already exists
        $existing = $db->table('part_checklist_templates')
                      ->where('part_id', $partId)
                      ->where('template_id', $templateId)
                      ->get()->getRow();
        
        if ($existing) {
            // Update existing assignment
            $db->table('part_checklist_templates')
               ->where('part_id', $partId)
               ->where('template_id', $templateId)
               ->update([
                   'custom_ranges' => $customRanges ? json_encode($customRanges) : null,
                   'is_active' => 1
               ]);
        } else {
            // Insert new assignment
            $db->table('part_checklist_templates')->insert($data);
        }
        
        session()->setFlashdata('success', 'Checklist template assigned to part successfully!');
        return redirect()->to('/parts/show/' . $partId);
    }

    public function getTemplates()
    {
        $templates = $this->checklistModel->findAll();
        return $this->response->setJSON($templates);
    }

    public function getTemplateItems($templateId)
    {
        $template = $this->checklistModel->getTemplateWithItems($templateId);
        $items = [];
        
        if ($template && $template['items']) {
            $itemsData = explode('||', $template['items']);
            foreach ($itemsData as $itemData) {
                if (empty($itemData)) continue;
                $item = explode('|', $itemData);
                if (count($item) >= 10) {
                    $items[] = [
                        'id' => $item[0] ?? '',
                        'item_name' => $item[1] ?? '',
                        'measurement_type' => $item[2] ?? '',
                        'measurement_unit' => $item[3] ?? '',
                        'normal_range_min' => $item[4] ?? '',
                        'normal_range_max' => $item[5] ?? '',
                        'warning_range_min' => $item[6] ?? '',
                        'warning_range_max' => $item[7] ?? '',
                        'critical_range_min' => $item[8] ?? '',
                        'critical_range_max' => $item[9] ?? ''
                    ];
                }
            }
        }
        
        return $this->response->setJSON(['items' => $items]);
    }
}