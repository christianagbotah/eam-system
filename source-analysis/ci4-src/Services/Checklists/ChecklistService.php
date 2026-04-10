<?php
namespace App\Services\Checklists;

use App\Models\OperatorChecklistModel;
use App\Models\ChecklistTemplateModel;

class ChecklistService {
    protected $model;
    protected $templateModel;

    public function __construct() {
        $this->model = new OperatorChecklistModel();
        $this->templateModel = new ChecklistTemplateModel();
    }

    public function createTemplate($data) {
        $data['template_code'] = 'CHKT-' . date('Ymd') . '-' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
        return $this->templateModel->insert($data);
    }

    public function createEntry($data) {
        $data['checklist_code'] = 'CHK-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        
        $score = 0;
        $maxScore = 0;
        $failed = [];
        
        foreach ($data['items'] as $item) {
            $maxScore += $item['weight'] ?? 1;
            if ($item['value'] === true || $item['value'] === 'pass') {
                $score += $item['weight'] ?? 1;
            } else {
                $failed[] = $item;
            }
        }
        
        $data['score'] = $score;
        $data['max_score'] = $maxScore;
        $data['pass_percentage'] = $maxScore > 0 ? round(($score / $maxScore) * 100, 2) : 0;
        $data['failed_items'] = json_encode($failed);
        
        return $this->model->insert($data);
    }

    public function validateEntry($id) {
        $checklist = $this->model->find($id);
        $template = $this->templateModel->find($checklist['template_id']);
        
        return $checklist['pass_percentage'] >= $template['pass_threshold'];
    }
}
