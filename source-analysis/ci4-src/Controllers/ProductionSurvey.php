<?php

namespace App\Controllers;

use App\Models\ProductionSurveyModel;
use App\Models\EquipmentModel;
use App\Models\PartsModel;
use App\Models\PmPartTaskModel;
use App\Models\PmScheduleNewModel;
use App\Models\SettingModel;

class ProductionSurvey extends BaseController
{
    protected $surveyModel;
    protected $equipmentModel;
    protected $partsModel;
    protected $pmPartTaskModel;
    protected $pmScheduleModel;
    protected $settingModel;

    public function __construct()
    {
        $this->surveyModel = new ProductionSurveyModel();
        $this->equipmentModel = new EquipmentModel();
        $this->partsModel = new PartsModel();
        $this->pmPartTaskModel = new PmPartTaskModel();
        $this->pmScheduleModel = new PmScheduleNewModel();
        $this->settingModel = new SettingModel();
    }

    public function index()
    {
        $data['equipment'] = $this->equipmentModel
            ->select('equipment.*, equipment_categories.name as category_name')
            ->join('equipment_categories', 'equipment_categories.id = equipment.category_id', 'left')
            ->findAll();
        return view('production_survey/index', $data);
    }

    public function record($equipmentId)
    {
        $equipment = $this->equipmentModel->find($equipmentId);
        if (!$equipment) {
            return redirect()->back()->with('error', 'Equipment not found');
        }

        $data = [
            'equipment' => $equipment,
            'production_unit' => $this->settingModel->getSetting('production_unit', 'Yards')
        ];
        return view('production_survey/record', $data);
    }

    public function save()
    {
        $equipmentId = $this->request->getPost('equipment_id');
        $surveyDate = $this->request->getPost('survey_date');
        
        $data = [
            'equipment_id' => $equipmentId,
            'survey_date' => $surveyDate,
            'units_per_shift' => $this->request->getPost('units_per_shift'),
            'hours_per_unit' => $this->request->getPost('hours_per_unit'),
            'target_per_machine' => $this->request->getPost('target_per_machine'),
            'total_time_available' => $this->request->getPost('units_per_shift') * $this->request->getPost('hours_per_unit') * 60,
            'break_mins' => $this->request->getPost('break_mins'),
            'repair_maint_mins' => $this->request->getPost('repair_maint_mins'),
            'input_delivery_mins' => $this->request->getPost('input_delivery_mins'),
            'changeover_mins' => $this->request->getPost('changeover_mins'),
            'startup_cleaning_mins' => $this->request->getPost('startup_cleaning_mins'),
            'others_mins' => $this->request->getPost('others_mins'),
            'preventive_maint_mins' => $this->request->getPost('preventive_maint_mins'),
            'production_morning' => $this->request->getPost('production_morning'),
            'production_afternoon' => $this->request->getPost('production_afternoon'),
            'production_night' => $this->request->getPost('production_night'),
            'remarks' => $this->request->getPost('remarks'),
            'recorded_by' => session()->get('user_id')
        ];

        $existing = $this->surveyModel
            ->where('equipment_id', $equipmentId)
            ->where('survey_date', $surveyDate)
            ->first();
        
        if ($existing) {
            $this->surveyModel->update($existing['id'], $data);
        } else {
            $this->surveyModel->insert($data);
        }

        return redirect()->to('/production-survey')->with('success', 'Production data saved successfully');
    }

    public function history($equipmentId)
    {
        $equipment = $this->equipmentModel->find($equipmentId);
        if (!$equipment) {
            return redirect()->back()->with('error', 'Equipment not found');
        }

        $data = [
            'equipment' => $equipment,
            'surveys' => $this->surveyModel->getSurveyHistory($equipmentId),
            'production_unit' => $this->settingModel->getSetting('production_unit', 'Yards')
        ];

        return view('production_survey/history', $data);
    }

    public function recordAll()
    {
        $surveyDate = $this->request->getGet('date') ?? date('Y-m-d');
        
        $equipment = $this->equipmentModel
            ->select('equipment.*, equipment_categories.name as category_name')
            ->join('equipment_categories', 'equipment_categories.id = equipment.category_id', 'left')
            ->findAll();
        
        $existingRecords = [];
        foreach ($equipment as $item) {
            $record = $this->surveyModel
                ->where('equipment_id', $item['id'])
                ->where('survey_date', $surveyDate)
                ->first();
            if ($record) {
                $existingRecords[$item['id']] = $record;
            }
        }
        
        $data = [
            'equipment' => $equipment,
            'survey_date' => $surveyDate,
            'existing_records' => $existingRecords,
            'production_unit' => $this->settingModel->getSetting('production_unit', 'Yards')
        ];
        return view('production_survey/record_all', $data);
    }

    public function saveAll()
    {
        $surveyDate = $this->request->getPost('survey_date');
        $equipmentData = $this->request->getPost('equipment');
        $recordedBy = session()->get('user_id');

        foreach ($equipmentData as $data) {
            $record = [
                'equipment_id' => $data['equipment_id'],
                'survey_date' => $surveyDate,
                'units_per_shift' => $data['units_per_shift'],
                'hours_per_unit' => $data['hours_per_unit'],
                'target_per_machine' => $data['target_per_machine'],
                'total_time_available' => $data['units_per_shift'] * $data['hours_per_unit'] * 60,
                'break_mins' => $data['break_mins'],
                'repair_maint_mins' => $data['repair_maint_mins'],
                'input_delivery_mins' => $data['input_delivery_mins'],
                'changeover_mins' => $data['changeover_mins'],
                'startup_cleaning_mins' => $data['startup_cleaning_mins'],
                'others_mins' => $data['others_mins'],
                'preventive_maint_mins' => $data['preventive_maint_mins'],
                'production_morning' => $data['production_morning'],
                'production_afternoon' => $data['production_afternoon'],
                'production_night' => $data['production_night'],
                'recorded_by' => $recordedBy
            ];
            
            $existing = $this->surveyModel
                ->where('equipment_id', $data['equipment_id'])
                ->where('survey_date', $surveyDate)
                ->first();
            
            if ($existing) {
                $this->surveyModel->update($existing['id'], $record);
            } else {
                $this->surveyModel->insert($record);
            }
        }

        return redirect()->to('/production-survey/record-all?date=' . $surveyDate)->with('success', 'Production data for all machines saved successfully');
    }

    public function report()
    {
        $surveyDate = $this->request->getGet('date') ?? date('Y-m-d');
        $month = date('F Y', strtotime($surveyDate));
        $week = ceil(date('d', strtotime($surveyDate)) / 7);
        
        $equipment = $this->equipmentModel
            ->select('equipment.*, equipment_categories.name as category_name')
            ->join('equipment_categories', 'equipment_categories.id = equipment.category_id', 'left')
            ->findAll();
        
        $reportData = [];
        foreach ($equipment as $item) {
            $record = $this->surveyModel
                ->select('production_survey.*')
                ->where('equipment_id', $item['id'])
                ->where('survey_date', $surveyDate)
                ->first();
            if ($record) {
                $equipCode = $item['equipment_id'];
                $merged = array_merge($item, $record);
                $merged['equipment_code'] = $equipCode;
                $merged['survey_id'] = $record['id'];
                $reportData[] = $merged;
            }
        }
        
        $data = [
            'equipment' => $reportData,
            'survey_date' => $surveyDate,
            'month' => $month,
            'week' => $week,
            'production_unit' => $this->settingModel->getSetting('production_unit', 'Yards')
        ];
        return view('production_survey/report', $data);
    }

    public function cumulativeSurvey()
    {
        $fromDate = $this->request->getGet('from') ?? date('Y-m-01');
        $toDate = $this->request->getGet('to') ?? date('Y-m-d');
        $filter = $this->request->getGet('filter') ?? '';
        
        $builder = $this->surveyModel
            ->select('equipment.id, equipment.name, equipment.equipment_id as equipment_code,
                AVG(production_survey.units_per_shift) as units_per_shift,
                AVG(production_survey.hours_per_unit) as hours_per_unit,
                AVG(production_survey.target_per_machine) as target_per_machine,
                SUM(production_survey.total_time_available) as total_time_available,
                SUM(production_survey.break_mins) as break_mins,
                SUM(production_survey.repair_maint_mins) as repair_maint_mins,
                SUM(production_survey.input_delivery_mins) as input_delivery_mins,
                SUM(production_survey.changeover_mins) as changeover_mins,
                SUM(production_survey.startup_cleaning_mins) as startup_cleaning_mins,
                SUM(production_survey.others_mins) as others_mins,
                SUM(production_survey.preventive_maint_mins) as preventive_maint_mins,
                SUM(production_survey.production_morning) as production_morning,
                SUM(production_survey.production_afternoon) as production_afternoon,
                SUM(production_survey.production_night) as production_night')
            ->join('equipment', 'equipment.id = production_survey.equipment_id')
            ->where('survey_date >=', $fromDate)
            ->where('survey_date <=', $toDate)
            ->groupBy('equipment.id');
        
        if ($filter) {
            $builder->groupStart()
                ->like('equipment.name', $filter)
                ->orLike('equipment.equipment_id', $filter)
                ->groupEnd();
        }
        
        $data = [
            'records' => $builder->orderBy('equipment.name', 'ASC')->findAll(),
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'filter' => $filter,
            'production_unit' => $this->settingModel->getSetting('production_unit', 'Yards')
        ];
        return view('production_survey/cumulative_survey', $data);
    }

    public function cumulativeSummary()
    {
        $fromDate = $this->request->getGet('from') ?? date('Y-m-01');
        $toDate = $this->request->getGet('to') ?? date('Y-m-d');
        $filter = $this->request->getGet('filter') ?? '';
        
        $builder = $this->surveyModel
            ->select('equipment.id, equipment.name, equipment.equipment_id as equipment_code,
                SUM(production_survey.total_time_available) as total_time,
                SUM(production_survey.break_mins) as break_mins,
                SUM(production_survey.repair_maint_mins) as repair_maint_mins,
                SUM(production_survey.input_delivery_mins) as input_delivery_mins,
                SUM(production_survey.changeover_mins) as changeover_mins,
                SUM(production_survey.startup_cleaning_mins) as startup_cleaning_mins,
                SUM(production_survey.others_mins) as others_mins,
                SUM(production_survey.preventive_maint_mins) as preventive_maint_mins,
                SUM(production_survey.production_morning) as production_morning,
                SUM(production_survey.production_afternoon) as production_afternoon,
                SUM(production_survey.production_night) as production_night,
                AVG(production_survey.target_per_machine) as target_per_machine')
            ->join('equipment', 'equipment.id = production_survey.equipment_id')
            ->where('survey_date >=', $fromDate)
            ->where('survey_date <=', $toDate)
            ->groupBy('equipment.id');
        
        if ($filter) {
            $builder->groupStart()
                ->like('equipment.name', $filter)
                ->orLike('equipment.equipment_id', $filter)
                ->groupEnd();
        }
        
        $data = [
            'records' => $builder->orderBy('equipment.name', 'ASC')->findAll(),
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'filter' => $filter,
            'production_unit' => $this->settingModel->getSetting('production_unit', 'Yards')
        ];
        return view('production_survey/cumulative_summary', $data);
    }

    public function saveStandards()
    {
        $json = $this->request->getJSON();
        $standards = $json->standards ?? [];
        
        foreach ($standards as $standard) {
            if (isset($standard->survey_id) && $standard->survey_id) {
                $this->surveyModel->update($standard->survey_id, [
                    'utilization_standard' => $standard->utilization_standard,
                    'speed_standard' => $standard->speed_standard
                ]);
            }
        }
        
        return $this->response->setJSON(['success' => true]);
    }
}
