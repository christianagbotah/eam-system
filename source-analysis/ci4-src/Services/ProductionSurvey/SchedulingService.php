<?php
namespace App\Services\ProductionSurvey;

use App\Models\SurveyScheduleModel;
use App\Models\ProductionSurveyModel;

class SchedulingService {
    protected $scheduleModel;
    protected $surveyModel;
    protected $templateService;

    public function __construct() {
        $this->scheduleModel = new SurveyScheduleModel();
        $this->surveyModel = new ProductionSurveyModel();
        $this->templateService = new TemplateService();
    }

    public function generateScheduledSurveys() {
        $schedules = $this->scheduleModel->where('is_active', true)
            ->where('next_generation_at <=', date('Y-m-d H:i:s'))
            ->findAll();

        foreach ($schedules as $schedule) {
            $this->createFromSchedule($schedule);
        }
    }

    private function createFromSchedule($schedule) {
        $surveyData = [
            'schedule_id' => $schedule['schedule_id'],
            'is_scheduled' => true,
            'machine_id' => $schedule['machine_id'],
            'shift_id' => $schedule['shift_id'],
            'assigned_to' => $schedule['auto_assign_user_id'],
            'status' => 'draft'
        ];

        if ($schedule['template_id']) {
            $surveyData = $this->templateService->applyTemplate($schedule['template_id'], $surveyData);
        }

        $this->surveyModel->insert($surveyData);

        $this->scheduleModel->update($schedule['schedule_id'], [
            'last_generated_at' => date('Y-m-d H:i:s'),
            'next_generation_at' => $this->calculateNextGeneration($schedule)
        ]);
    }

    private function calculateNextGeneration($schedule) {
        $interval = match($schedule['frequency']) {
            'daily' => '+1 day',
            'weekly' => '+1 week',
            'monthly' => '+1 month',
            'per_shift' => '+8 hours',
            default => '+' . $schedule['frequency_value'] . ' days'
        };
        return date('Y-m-d H:i:s', strtotime($interval));
    }
}
