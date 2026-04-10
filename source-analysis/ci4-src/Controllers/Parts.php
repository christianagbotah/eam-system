<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\AssemblyModel;
use App\Models\EquipmentModel;
use App\Models\PartsModel;
use App\Models\PartsCategoryModel;

use App\Models\PmInspectionTypeModel;
use App\Models\PmModeModel;
use App\Models\PmTriggerModel;
use App\Models\PmTypeModel;
use App\Models\PmScheduleNewModel;
use App\Models\PmTaskModel;

class Parts extends BaseController
{
    protected $assemblyModel;
    protected $equipmentModel;
    protected $partsModel;

    protected $pmInspectionTypeModel;
    protected $pmModeModel;
    protected $pmTriggerModel;
    protected $pmTypeModel;
    protected $pmScheduleModel;

    public function __construct()
    {
        $this->assemblyModel = new AssemblyModel();
        $this->equipmentModel = new EquipmentModel();
        $this->partsModel = new PartsModel();
        $this->partsCategoryModel = new PartsCategoryModel();

        $this->pmInspectionTypeModel = new PmInspectionTypeModel();
        $this->pmModeModel = new PmModeModel();
        $this->pmTriggerModel = new PmTriggerModel();
        $this->pmTypeModel = new PmTypeModel();
        $this->pmScheduleModel = new PmScheduleNewModel();
        $this->pmTaskModel = new PmTaskModel();


        helper(['form', 'html']);
        
        // Check authentication
        if (!session()->get('isLoggedIn')) {
            header('Location: ' . base_url('auth/login'));
            exit();
        }
    }

    public function index()
    {
        $data = [

            'parts' => $this->assemblyModel->getPartsByAssembly()
        ];

        return view('backend/parts/index', $data);
    }

    /*list all parts*/
    public function partLists($parts_ids = ''): string
    {   
        if($parts_ids == '' || empty($parts_ids)) {

             $data = [
                'allParts' => $this->partsModel->findAll(),
                'controller' => 'parts',
                'assemblyModel' => $this->assemblyModel,
                'partsCategoryModel' => $this->partsCategoryModel
            ];

        } else {

            $parts_ids = explode('-', $parts_ids);

             $data = [
                'allParts' => $this->partsModel->whereIn('id', $parts_ids)->findAll(),
                'controller' => 'parts',
                'assemblyModel' => $this->assemblyModel,
                'partsCategoryModel' => $this->partsCategoryModel
            ];
        }
       
        return view('backend/parts/list_parts', $data);
    }

    public function show($id)
    {
        $parts = $this->partsModel->getParById($id);
        $pmScheduleList = $this->pmScheduleModel->where('part_id', $id)->findAll();

        if (!$parts) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Parts not found');
        }

        $data = [

            'part' => $parts,
            'controller' => 'parts',
            'assemblyModel' => $this->assemblyModel,
            'equipmentModel' => $this->equipmentModel,
            'partsCategoryModel' => $this->partsCategoryModel,

            'pmInspectionTypeModel' => $this->pmInspectionTypeModel,
            'pmModeModel' => $this->pmModeModel,
            'pmTriggerModel' => $this->pmTriggerModel,
            'pmTypeModel' => $this->pmTypeModel,
            'pmScheduleList' => $pmScheduleList,

        ];

        return view('backend/parts/single_part', $data);
    }

    public function create()
    {
        /*$assembly = $this->assemblyModel->find($assemblyId);

        if (!$assembly) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Assembly not found');
        }*/

        if ($this->request->getMethod() === 'POST') {
            return $this->store();
        }

        $data = [
            'allAssemblies' => $this->assemblyModel->findAll(),
            'partsCategories' => $this->partsCategoryModel->findAll(),
            'controller' => 'parts',
        ];

        return view('backend/parts/add_parts', $data);
    }

    public function store()
    {
        $rules = [
            'name' => 'required|max_length[200]',
            'assembly_id' => 'required|is_natural_no_zero',
            'part_number' => 'permit_empty|max_length[50]|is_unique[parts.part_number]',
            'image_file' => 'permit_empty|uploaded[image_file]|max_size[image_file,5120]|ext_in[image_file,jpg,jpeg,png,webp]'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }
        $equipmentId = $this->equipmentModel->getEquipmentIdByAssemblyId($this->request->getPost('assembly_id'));
        
        $partData = [
            'assembly_id' => $this->request->getPost('assembly_id'),
            'equipment_id' => $equipmentId,
            'part_number' => $this->request->getPost('part_number'),
            'name' => $this->request->getPost('name'),
            'category' => $this->request->getPost('category'),
            'manufacturer' => $this->request->getPost('manufacturer'),
            'supplier' => $this->request->getPost('supplier'),
            'description' => $this->request->getPost('description'),
            'specifications' => $this->request->getPost('specifications'),
            'position_x' => $this->request->getPost('position_x') ?: 0,
            'position_y' => $this->request->getPost('position_y') ?: 0,
            'position_z' => $this->request->getPost('position_z') ?: 0,
            'rotation_x' => $this->request->getPost('rotation_x') ?: 0,
            'rotation_y' => $this->request->getPost('rotation_y') ?: 0,
            'rotation_z' => $this->request->getPost('rotation_z') ?: 0,
            'scale_x' => $this->request->getPost('scale_x') ?: 1,
            'scale_y' => $this->request->getPost('scale_y') ?: 1,
            'scale_z' => $this->request->getPost('scale_z') ?: 1,
            'color' => $this->request->getPost('color') ?: '#808080',
            //'lead_time_days' => $this->request->getPost('lead_time_days'),
            //'stock_quantity' => $this->request->getPost('stock_quantity'),
            //'unit_cost' => $this->request->getPost('unit_cost'),
            'material' => $this->request->getPost('material') ?: 'metal',
            'criticality' => $this->request->getPost('criticality') ?: '1',
            //'maintenance_schedule' => $this->request->getPost('maintenance_schedule') ?: 'monthly',
            'expected_life_hours' => $this->request->getPost('expected_life_hours'),
            //'installation_date' => $this->request->getPost('installation_date'),
            'status' => $this->request->getPost('status') ?: 'in_service'
        ];


        $partId = $this->partsModel->insert($partData);

        if ($partId) {

            // Handle image file upload
            $imageFiles = array(
                'image_file', 'top_view_file', 'right_view_file', 'bottom_view_file', 'left_view_file', 'front_view_file', 'back_view_file'
            );

            $filesPathsArray = array();
            $counter = 0;

            for($i = 0; $i < sizeof($imageFiles); $i++) {

                $pos = strpos($imageFiles[$i], '_');
                $view = substr($imageFiles[$i], 0, $pos);

                $imageFile = $this->request->getFile($imageFiles[$i]);
                if ($imageFile && $imageFile->isValid() && !$imageFile->hasMoved()) {

                    $fileName = 'part_' . $partId . '_'.$view.'_' . time() . '.' . $imageFile->getExtension();

                    $filePath = 'assets/uploads/part_image/' . $fileName;
                    $response = $this->uploadPartImage($fileName, $imageFile);

                    if($response) {
                        $counter++;

                        /*build the array*/
                        $filesPathsArray[$view] = $filePath;
                    }
                }   
            }


            /*do final update of the files paths in the database */
            $filesPathsJson = json_encode($filesPathsArray);
            $this->partsModel->update($partId, [
                'image_file_path' => $filesPathsJson
            ]);

            session()->setFlashdata('success', 'Part added successfully!');
            return redirect()->to('/parts/create?success=1');
        } else {
            session()->setFlashdata('error', 'Failed to add part. Please try again.');
            return redirect()->back()->withInput();
        }
    }

    protected function uploadPartImage($fileName, $imageFile)
    {
        $uploadPath = ROOTPATH . 'public/assets/uploads/part_image/';
        
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }
        
        if ($imageFile->move($uploadPath, $fileName)) {
            
            return true;
        }

        return false;
    }

    public function edit($id)
    {
        $part = $this->partsModel->find($id);

        if (!$part) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Part not found');
        }

        if ($this->request->getMethod() === 'POST') {
            return $this->update($id);
        }

        $assembly = $this->assemblyModel->find($part['assembly_id']);

        $data = [
           // 'title' => 'Edit Assembly - ' . $assembly['name'],
            'assembly' => $assembly,
            'part' => $part
        ];

        return view('backend/part/edit', $data);
    }

    public function update($id)
    {
        $part = $this->partsModel->find($id);

        if (!$part) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Part not found');
        }

        $rules = [
            'name' => 'required|max_length[200]',
            'assembly_id' => 'required|is_natural_no_zero'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $assemblyData = [
            'name' => $this->request->getPost('name'),
            'category' => $this->request->getPost('category'),
            'description' => $this->request->getPost('description'),
            'position_x' => $this->request->getPost('position_x') ?: 0,
            'position_y' => $this->request->getPost('position_y') ?: 0,
            'position_z' => $this->request->getPost('position_z') ?: 0,
            'rotation_x' => $this->request->getPost('rotation_x') ?: 0,
            'rotation_y' => $this->request->getPost('rotation_y') ?: 0,
            'rotation_z' => $this->request->getPost('rotation_z') ?: 0,
            'scale_x' => $this->request->getPost('scale_x') ?: 1,
            'scale_y' => $this->request->getPost('scale_y') ?: 1,
            'scale_z' => $this->request->getPost('scale_z') ?: 1,
            'color' => $this->request->getPost('color') ?: '#808080',
            'material' => $this->request->getPost('material') ?: 'metal',
            'priority' => $this->request->getPost('priority') ?: 'medium',
            'maintenance_schedule' => $this->request->getPost('maintenance_schedule') ?: 'monthly',
            'expected_lifespan' => $this->request->getPost('expected_lifespan'),
            'installation_date' => $this->request->getPost('installation_date'),
            'status' => $this->request->getPost('status') ?: 'operational'
        ];

        if ($this->assemblyModel->update($id, $assemblyData)) {
            session()->setFlashdata('success', 'Assembly updated successfully!');
            return redirect()->to('/assembly/show/' . $id);
        } else {
            session()->setFlashdata('error', 'Failed to update assembly. Please try again.');
            return redirect()->back()->withInput();
        }
    }

    public function delete($id)
    {
        $assembly = $this->assemblyModel->find($id);

        if (!$assembly) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Assembly not found');
        }

        if ($this->assemblyModel->delete($id)) {
            session()->setFlashdata('success', 'Assembly deleted successfully!');
        } else {
            session()->setFlashdata('error', 'Failed to delete assembly. Please try again.');
        }

        return redirect()->to('/equipment/assemblies/' . $assembly['equipment_id']);
    }

    // AJAX Methods
    public function ajaxUpdatePosition()
    {
        $id = $this->request->getPost('id');
        $positionData = [
            'position_x' => $this->request->getPost('position_x'),
            'position_y' => $this->request->getPost('position_y'),
            'position_z' => $this->request->getPost('position_z'),
            'rotation_x' => $this->request->getPost('rotation_x'),
            'rotation_y' => $this->request->getPost('rotation_y'),
            'rotation_z' => $this->request->getPost('rotation_z'),
            'scale_x' => $this->request->getPost('scale_x'),
            'scale_y' => $this->request->getPost('scale_y'),
            'scale_z' => $this->request->getPost('scale_z')
        ];

        if ($this->assemblyModel->updatePosition($id, $positionData)) {
            return $this->response->setJSON(['success' => true, 'message' => 'Position updated successfully']);
        } else {
            return $this->response->setJSON(['success' => false, 'message' => 'Failed to update position']);
        }
    }


    public function createPmTask() {
        $partId = $this->request->getPost('part_id');
        $tasks = $this->request->getPost('tasks');
        
        if (empty($tasks)) {
            echo json_encode(['status' => 'failed', 'message' => 'No tasks provided']);
            return;
        }

        $pmPartTaskModel = new \App\Models\PmPartTaskModel();
        $scheduleModel = new PmScheduleNewModel();
        $part = $this->partsModel->find($partId);
        $errors = [];
        $successCount = 0;

        foreach ($tasks as $index => $taskData) {
            $pmTask = $this->pmTaskModel->find($taskData['pm_task_id']);
            
            $pmPartTaskData = [
                'part_id' => $partId,
                'task_name' => $pmTask['task_name'] ?? '',
                'task_description' => $pmTask['task_description'] ?? '',
                'frequency_value' => $taskData['frequency_value'],
                'estimated_duration' => $taskData['estimated_duration'],
                'pm_type_id' => $taskData['pm_type_id'],
                'pm_trigger_id' => $taskData['pm_trigger_id'],
                'pm_mode_id' => $taskData['pm_mode_id'],
                'pm_inspection_type_id' => $taskData['pm_inspection_type_id'],
                'is_active' => 1
            ];

            // Check for duplicate
            $duplicateQuery = $pmPartTaskModel->where('part_id', $partId)
                            ->where('task_name', $pmPartTaskData['task_name'])
                            ->findAll();

            if(count($duplicateQuery) > 0) {
                $errors[] = "Task '{$pmPartTaskData['task_name']}' already exists";
                continue;
            }

            $taskId = $pmPartTaskModel->insert($pmPartTaskData);

            if($taskId) {
                $startDate = date('Y-m-d');
                $trigger = $this->pmTriggerModel->find($pmPartTaskData['pm_trigger_id']);
                $nextDueDate = $scheduleModel->calculateNextDueDate([
                    'start_date' => $startDate,
                    'frequency_value' => $pmPartTaskData['frequency_value'],
                    'frequency_unit' => $trigger['trigger_name'] ?? 'days'
                ]);
                
                $scheduleModel->insert([
                    'part_task_id' => $taskId,
                    'equipment_id' => $part['equipment_id'],
                    'part_id' => $partId,
                    'start_date' => $startDate,
                    'next_due_date' => $nextDueDate,
                    'status' => 'scheduled'
                ]);
                
                $successCount++;
            }
        }

        if ($successCount > 0) {
            $message = "$successCount task(s) assigned successfully";
            if (!empty($errors)) {
                $message .= ". Skipped: " . implode(', ', $errors);
            }
            echo json_encode(['status' => 'success', 'message' => $message]);
        } else {
            echo json_encode(['status' => 'failed', 'message' => 'No tasks were added. ' . implode(', ', $errors)]);
        }
    }

    public function assignPmTasksToPart($partId) {

        $data = [
            'partId' => $partId,
            'pmTasks' => $this->pmTaskModel->findAll(),
            'pmInspectionTypes' => $this->pmInspectionTypeModel->findAll(),
            'pmModes' => $this->pmModeModel->findAll(),
            'pmTriggers' => $this->pmTriggerModel->findAll(),
            'pmTypes' => $this->pmTypeModel->findAll()
        ];

        return view('backend/parts/assign_pm_tasks', $data);
    }

    public function editPmTask($taskId) {
        $pmPartTaskModel = new \App\Models\PmPartTaskModel();
        $task = $pmPartTaskModel->find($taskId);

        if (!$task) {
            return redirect()->back()->with('error', 'Task not found');
        }

        $data = [
            'task' => $task,
            'pmTasks' => $this->pmTaskModel->findAll(),
            'pmInspectionTypes' => $this->pmInspectionTypeModel->findAll(),
            'pmModes' => $this->pmModeModel->findAll(),
            'pmTriggers' => $this->pmTriggerModel->findAll(),
            'pmTypes' => $this->pmTypeModel->findAll()
        ];

        return view('backend/parts/edit_pm_task', $data);
    }

    public function updatePmTask($taskId) {
        $pmPartTaskModel = new \App\Models\PmPartTaskModel();
        $task = $pmPartTaskModel->find($taskId);

        if (!$task) {
            echo json_encode(['status' => 'failed', 'message' => 'Task not found']);
            return;
        }

        $updateData = [
            'task_name' => $this->request->getPost('task_name'),
            'frequency_value' => $this->request->getPost('frequency_value'),
            'estimated_duration' => $this->request->getPost('estimated_duration'),
            'pm_type_id' => $this->request->getPost('pm_type_id'),
            'pm_trigger_id' => $this->request->getPost('pm_trigger_id'),
            'pm_mode_id' => $this->request->getPost('pm_mode_id'),
            'pm_inspection_type_id' => $this->request->getPost('pm_inspection_type_id')
        ];

        $errors = [];
        foreach($updateData as $key => $val) {
            if(($val === '' || $val === null) && $key !== 'task_description') {
                $errors[$key] = ucwords(strtolower(str_replace('_', ' ', $key))). ' is required';
            }
        }

        if(!empty($errors)) {
            echo json_encode($errors);
            return;
        }

        if($pmPartTaskModel->update($taskId, $updateData)) {
            echo json_encode(['status' => 'success', 'message' => 'PM task updated successfully']);
        } else {
            echo json_encode(['status' => 'failed', 'message' => 'Failed to update task']);
        }
    }

    public function deletePmTask($taskId) {
        $pmPartTaskModel = new \App\Models\PmPartTaskModel();
        $task = $pmPartTaskModel->find($taskId);

        if (!$task) {
            echo json_encode(['status' => 'error', 'message' => 'Task not found']);
            return;
        }

        if($pmPartTaskModel->delete($taskId)) {
            echo json_encode(['status' => 'success', 'message' => 'PM task deleted successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete task']);
        }
    }

    public function pmTasksDatatableApi($partId)
    {
        // Get DataTable parameters
        $draw = intval($this->request->getPost('draw'));
        $start = intval($this->request->getPost('start'));
        $length = intval($this->request->getPost('length'));
        $searchValue = $this->request->getPost('search')['value'] ?? '';
        
        // Get PM tasks from new pm_part_tasks table
        $pmPartTaskModel = new \App\Models\PmPartTaskModel();
        $pmPartTasks = $pmPartTaskModel->where('part_id', $partId)->findAll();
        
        // Apply search filter
        $filteredData = $pmPartTasks;
        if ($searchValue) {
            $filteredData = array_filter($pmPartTasks, function($item) use ($searchValue) {
                $trigger = $this->pmTriggerModel->find($item['pm_trigger_id']);
                $triggerName = $trigger['trigger_name'] ?? '';
                return stripos($item['task_name'] ?? '', $searchValue) !== false ||
                       stripos($item['frequency_value'] . ' ' . $triggerName, $searchValue) !== false;
            });
        }
        
        $totalRecords = count($pmPartTasks);
        $filteredRecords = count($filteredData);
        
        // Apply pagination
        $paginatedData = array_slice($filteredData, $start, $length);
        
        // Format data
        $formattedData = [];
        $taskNo = $start + 1;
        
        foreach ($paginatedData as $item) {
            $pmInspection = $this->pmInspectionTypeModel->find($item['pm_inspection_type_id']);
            $pmMode = $this->pmModeModel->find($item['pm_mode_id']);
            $pmTrigger = $this->pmTriggerModel->find($item['pm_trigger_id']);
            $pmType = $this->pmTypeModel->find($item['pm_type_id']);
            
            $priorityColors = [
                'low' => 'bg-green-100 text-green-800',
                'medium' => 'bg-yellow-100 text-yellow-800',
                'high' => 'bg-orange-100 text-orange-800',
                'critical' => 'bg-red-100 text-red-800'
            ];
            
            $formattedData[] = [
                'task_id' => $taskNo,
                'task_name' => esc($item['task_name']),
                'frequency' => '<span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">' . 
                               esc($item['frequency_value']) . ' ' . ucfirst($pmTrigger['trigger_name'] ?? '') . '</span>',
                'trigger_name' => esc($pmTrigger['trigger_name'] ?? 'N/A'),
                'type_name' => esc($pmType['type_name'] ?? 'N/A'),
                'mode_name' => esc($pmMode['mode_name'] ?? 'N/A'),
                'pm_duration' => esc($item['estimated_duration']),
                'inspection_name' => esc($pmInspection['inspection_name'] ?? 'N/A'),
                'actions' => '<div class="flex space-x-2">
                    <button type="button" class="text-green-600 hover:text-green-800" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="text-red-600 hover:text-red-800" title="Delete" onclick="return confirm(\'Are you sure?\')">  
                        <i class="fas fa-trash"></i>
                    </button>
                </div>'
            ];
            $taskNo++;
        }
        
        return $this->response->setJSON([
            'draw' => $draw,
            'recordsTotal' => $totalRecords,
            'recordsFiltered' => $filteredRecords,
            'data' => $formattedData
        ]);
    }
}