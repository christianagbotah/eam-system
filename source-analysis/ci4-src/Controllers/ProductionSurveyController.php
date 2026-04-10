<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class ProductionSurveyController extends ResourceController
{
    protected $modelName = 'App\Models\ProductionSurveyModel';
    protected $format = 'json';

    public function index()
    {
        $date = $this->request->getGet('date');
        $startDate = $this->request->getGet('start_date');
        $endDate = $this->request->getGet('end_date');

        $builder = $this->model->builder();
        
        if ($date) {
            $builder->where('survey_date', $date);
        } elseif ($startDate && $endDate) {
            $builder->where('survey_date >=', $startDate);
            $builder->where('survey_date <=', $endDate);
        }

        $surveys = $builder->get()->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data' => $surveys
        ]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $date = $data['date'];
        $surveys = $data['surveys'];

        $db = \Config\Database::connect();
        $db->transStart();

        foreach ($surveys as $survey) {
            $surveyData = [
                'survey_date' => $date,
                'machine_id' => $survey['machine_id'],
                'machine_code' => $survey['code'],
                'machine_name' => $survey['name'],
                'units_per_day' => $survey['units_per_day'],
                'hours_per_shift' => $survey['hours_per_shift'],
                'target_per_unit' => $survey['target_per_unit'],
                'total_available' => $survey['total_available'],
                'break_mins' => $survey['break_mins'],
                'repair_maint' => $survey['repair_maint'],
                'input_delivery' => $survey['input_delivery'],
                'change_over' => $survey['change_over'],
                'startup_cleaning' => $survey['startup_cleaning'],
                'others' => $survey['others'],
                'preventive_maint' => $survey['preventive_maint'],
                'total_downtime' => $survey['total_downtime'],
                'productive_time' => $survey['productive_time']
            ];

            $existing = $this->model->where('survey_date', $date)
                                    ->where('machine_id', $survey['machine_id'])
                                    ->first();

            if ($existing) {
                $this->model->update($existing['id'], $surveyData);
            } else {
                $this->model->insert($surveyData);
            }
        }

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->fail('Failed to save survey data');
        }

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Survey data saved successfully'
        ]);
    }
}
