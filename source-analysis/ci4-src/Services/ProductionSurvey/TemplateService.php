<?php
namespace App\Services\ProductionSurvey;

use App\Models\SurveyTemplateModel;

class TemplateService {
    protected $templateModel;

    public function __construct() {
        $this->templateModel = new SurveyTemplateModel();
    }

    public function createTemplate($data) {
        $template = [
            'template_code' => $this->generateTemplateCode(),
            'template_name' => $data['template_name'],
            'description' => $data['description'] ?? null,
            'machine_type' => $data['machine_type'] ?? null,
            'department_id' => $data['department_id'] ?? null,
            'template_data' => json_encode($data['template_data']),
            'field_config' => json_encode($data['field_config'] ?? []),
            'validation_rules' => json_encode($data['validation_rules'] ?? []),
            'created_by' => $data['created_by']
        ];

        return $this->templateModel->insert($template);
    }

    public function applyTemplate($templateId, $surveyData) {
        $template = $this->templateModel->find($templateId);
        if (!$template) return null;

        $templateData = json_decode($template['template_data'], true);
        return array_merge($templateData, $surveyData, ['template_id' => $templateId]);
    }

    private function generateTemplateCode() {
        return 'TPL-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
    }
}
