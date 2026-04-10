<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\EquipmentModel;
use App\Models\EquipmentCategoryModel;
use App\Models\AssemblyModel;
use App\Models\AssemblyCategoryModel;
use App\Models\PartsModel;
use App\Models\PartsCategoryModel;

class Machine extends BaseController
{
    protected $equipmentModel;
    protected $categoryModel;
    protected $assemblyModel;
    protected $assemblyCategoryModel;
    protected $partsModel;
    protected $partsCategoryModel;

    public function __construct()
    {
        $this->equipmentModel = new EquipmentModel();
        $this->categoryModel = new EquipmentCategoryModel();
        $this->assemblyModel = new AssemblyModel();
        $this->assemblyCategoryModel = new AssemblyCategoryModel();
        $this->partsModel = new PartsModel();
        $this->partsCategoryModel = new PartsCategoryModel();

        helper('form');
        
        // Check authentication
        if (!session()->get('isLoggedIn')) {
            return redirect()->to('/auth/login');
        }
    }

    public function index()
    {
        $filters = [
            'category' => $this->request->getGet('category'),
            'status' => $this->request->getGet('status'),
            'location' => $this->request->getGet('location'),
            'search' => $this->request->getGet('search')
        ];

        $data = [
            //'title' => 'Equipment Management - GTP Maintenance System',
            'equipment' => $this->equipmentModel->searchEquipment($filters),
            'categories' => $this->categoryModel->findAll(),
            'stats' => $this->equipmentModel->getEquipmentStats(),
            'filters' => $filters
        ];

        return view('equipment/index', $data);
    }


    /*Machines*/
    public function machineLists(): string
    {   
        $data = [
            'allMachines' => $this->equipmentModel->findAll(),
            'controller' => 'machine',
            'assemblyModel' => $this->assemblyModel,
            'partsModel' => $this->partsModel,
        ];
        return view('backend/machine/list_machines', $data);
    }


    public function show($id)
    {
        $equipment = $this->equipmentModel->getMachineById($id);

        if (!$equipment) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Machine not found');
        }

         $data = [
            'equipment' => $equipment,
            'assemblyModel' => $this->assemblyModel,
            'partsModel' => $this->partsModel,
            'controller' => 'machine'
        ];

        return view('backend/machine/single_machine', $data);
    }

    public function create()
    {
        if ($this->request->getMethod() === 'POST') {
            return $this->store();
        }

        $data = [
            //'title' => 'Add New Equipment - GTP Maintenance System',
            'allMachines' => $this->equipmentModel->findAll(),
            'categories' => $this->categoryModel->findAll(),
            'controller' => 'machine',

        ];

        return view('backend/machine/add_machine', $data);
    }

    public function create3d()
    {
        $data = [
            'controller' => 'machine',
        ];
        return view('backend/machine/add_3d_viewer', $data);
    }

    public function store()
    {
        $rules = [
            'name' => 'required|max_length[200]',
            'category_id' => 'required|is_natural_no_zero',
            'equipment_id' => 'permit_empty|max_length[50]|is_unique[equipment.equipment_id]',
            'model_file' => 'permit_empty|uploaded[model_file]|max_size[model_file,102400]|ext_in[model_file,gltf,glb,obj,fbx,dae,zip]',
            'image_file' => 'permit_empty|uploaded[image_file]|max_size[image_file,5120]|ext_in[image_file,jpg,jpeg,png,webp]'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $equipmentData = [
            'equipment_id' => $this->request->getPost('equipment_id'),
            'name' => $this->request->getPost('name'),
            'category_id' => $this->request->getPost('category_id'),
            'manufacturer' => $this->request->getPost('manufacturer'),
            'model' => $this->request->getPost('model'),
            'serial_number' => $this->request->getPost('serial_number'),
            'purchase_date' => $this->request->getPost('purchase_date'),
            'installation_date' => $this->request->getPost('installation_date'),
            'warranty_expiry' => $this->request->getPost('warranty_expiry'),
            'location' => $this->request->getPost('location'),
            'department' => $this->request->getPost('department'),
            'status' => $this->request->getPost('status'),
            'criticality' => $this->request->getPost('criticality'),
            'description' => $this->request->getPost('description'),
            'purchase_cost' => $this->request->getPost('purchase_cost'),
            'expected_life_hours' => $this->request->getPost('expected_life_hours'),
            'created_by' => 1//session()->get('user_id')
        ];

        // Handle specifications
        $specifications = $this->request->getPost('specifications');
        if ($specifications) {
            $specsArray = [];
            foreach ($specifications as $spec) {
                if (!empty($spec['key']) && !empty($spec['value'])) {
                    $specsArray[$spec['key']] = $spec['value'];
                }
            }
            $equipmentData['specifications'] = json_encode($specsArray);
        }

        $equipmentId = $this->equipmentModel->insert($equipmentData);

        if ($equipmentId) {
            // Sync to unified assets
            try {
                $assetModel = new \App\Models\AssetUnifiedModel();
                $assetModel->syncFromMachine(array_merge($equipmentData, ['id' => $equipmentId]));
            } catch (\Exception $e) {
                log_message('error', 'Failed to sync machine to assets_unified: ' . $e->getMessage());
            }
            // Handle 3D model upload
            $modelFile = $this->request->getFile('model_file');
            if ($modelFile && $modelFile->isValid() && !$modelFile->hasMoved()) {
                $this->upload3DModel($equipmentId, $modelFile);
            }

            // Handle image files upload
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

                    $fileName = 'machine_' . $equipmentId . '_'.$view.'_' . time() . '.' . $imageFile->getExtension();

                    $filePath = 'assets/uploads/machine_image/' . $fileName;
                    $response = $this->uploadMachineImage($fileName, $imageFile);

                    if($response) {
                        $counter++;

                        /*build the array*/
                        $filesPathsArray[$view] = $filePath;
                    }
                }   
            }


            /*do final update of the files paths in the database */
            $filesPathsJson = json_encode($filesPathsArray);
            $this->equipmentModel->update($equipmentId, [
                'image_file_path' => $filesPathsJson
            ]);

            session()->setFlashdata('success', 'Machine added successfully!');
            return redirect()->to('/machine/create?success=1');
        } else {
            session()->setFlashdata('error', 'Failed to add machine. Please try again.');
            return redirect()->back()->withInput();
        }
    }

    public function edit($id)
    {
        $equipment = $this->equipmentModel->find($id);

        if (!$equipment) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Equipment not found');
        }

        if ($this->request->getMethod() === 'POST') {
            return $this->update($id);
        }

        $data = [
            'title' => 'Edit Equipment - ' . $equipment['name'],
            'equipment' => $equipment,
            'categories' => $this->categoryModel->findAll()
        ];

        return view('equipment/edit', $data);
    }

    public function update($id)
    {
        $equipment = $this->equipmentModel->find($id);

        if (!$equipment) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Equipment not found');
        }

        $rules = [
            'name' => 'required|max_length[200]',
            'category_id' => 'required|is_natural_no_zero',
            'model_file' => 'permit_empty|uploaded[model_file]|max_size[model_file,102400]|ext_in[model_file,gltf,glb,obj,fbx,dae,zip]'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $equipmentData = [
            'equipment_id' => $this->request->getPost('equipment_id'),
            'name' => $this->request->getPost('name'),
            'category_id' => $this->request->getPost('category_id'),
            'manufacturer' => $this->request->getPost('manufacturer'),
            'model' => $this->request->getPost('model'),
            'serial_number' => $this->request->getPost('serial_number'),
            'purchase_date' => $this->request->getPost('purchase_date'),
            'installation_date' => $this->request->getPost('installation_date'),
            'warranty_expiry' => $this->request->getPost('warranty_expiry'),
            'location' => $this->request->getPost('location'),
            'department' => $this->request->getPost('department'),
            'status' => $this->request->getPost('status'),
            'criticality' => $this->request->getPost('criticality'),
            'description' => $this->request->getPost('description'),
            'purchase_cost' => $this->request->getPost('purchase_cost'),
            'expected_life_hours' => $this->request->getPost('expected_life_hours'),
        ];

        // Handle specifications
        $specifications = $this->request->getPost('specifications');
        if ($specifications) {
            $specsArray = [];
            foreach ($specifications as $spec) {
                if (!empty($spec['key']) && !empty($spec['value'])) {
                    $specsArray[$spec['key']] = $spec['value'];
                }
            }
            $equipmentData['specifications'] = json_encode($specsArray);
        }

        if ($this->equipmentModel->update($id, $equipmentData)) {
            // Sync to unified assets
            try {
                $assetModel = new \App\Models\AssetUnifiedModel();
                $existing = $assetModel->where('asset_code', 'M-' . $id)->first();
                if ($existing) {
                    $assetModel->update($existing['id'], [
                        'asset_name' => $equipmentData['name'],
                        'manufacturer' => $equipmentData['manufacturer'],
                        'model_number' => $equipmentData['model'],
                        'serial_number' => $equipmentData['serial_number'],
                        'status' => $equipmentData['status'],
                        'criticality' => $equipmentData['criticality'],
                    ]);
                }
            } catch (\Exception $e) {
                log_message('error', 'Failed to update assets_unified: ' . $e->getMessage());
            }
            // Handle 3D model upload
            $modelFile = $this->request->getFile('model_file');
            if ($modelFile && $modelFile->isValid() && !$modelFile->hasMoved()) {
                $this->upload3DModel($id, $modelFile);
            }

            // Handle image file upload
            $imageFile = $this->request->getFile('image_file');
            if ($imageFile && $imageFile->isValid() && !$imageFile->hasMoved()) {
                $this->uploadMachineImage($equipmentId, $imageFile);
            }

            session()->setFlashdata('success', 'Equipment updated successfully!');
            return redirect()->to('/equipment/show/' . $id);
        } else {
            session()->setFlashdata('error', 'Failed to update equipment. Please try again.');
            return redirect()->back()->withInput();
        }
    }

    public function delete($id)
    {
        $equipment = $this->equipmentModel->find($id);

        if (!$equipment) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Equipment not found');
        }

        if ($this->equipmentModel->delete($id)) {
            session()->setFlashdata('success', 'Equipment deleted successfully!');
        } else {
            session()->setFlashdata('error', 'Failed to delete equipment. Please try again.');
        }

        return redirect()->to('/equipment');
    }

    public function viewer3d($id)
    {
        $equipment = $this->equipmentModel->getEquipmentWithAssemblies($id);

        if (!$equipment) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Equipment not found');
        }

        $data = [
            'title' => '3D Viewer - ' . $equipment['name'],
            'equipment' => $equipment
        ];

        return view('equipment/3d_viewer', $data);
    }

    public function assemblies($equipmentId)
    {
        $equipment = $this->equipmentModel->find($equipmentId);

        if (!$equipment) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Equipment not found');
        }

        $data = [
            'title' => 'Assemblies - ' . $equipment['name'],
            'equipment' => $equipment,
            'assemblies' => $this->assemblyModel->getAssembliesByEquipment($equipmentId)
        ];

        return view('equipment/assemblies', $data);
    }

    public function parts($equipmentId)
    {
        $equipment = $this->equipmentModel->find($equipmentId);

        if (!$equipment) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Equipment not found');
        }

        $assemblies = $this->assemblyModel->where('equipment_id', $equipmentId)->findAll();
        $assemblyIds = array_column($assemblies, 'id');

        $parts = [];
        foreach ($assemblyIds as $assemblyId) {
            $assemblyParts = $this->partsModel->getPartsWithAssemblyInfo($assemblyId);
            $parts = array_merge($parts, $assemblyParts);
        }

        $data = [
            'title' => 'Parts Inventory - ' . $equipment['name'],
            'equipment' => $equipment,
            'parts' => $parts,
            'assemblies' => $assemblies
        ];

        return view('equipment/parts', $data);
    }

    protected function upload3DModel($equipmentId, $modelFile)
    {
        $uploadPath = ROOTPATH . 'public/assets/uploads/3d_models/';
        
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }

        $fileName = 'equipment_' . $equipmentId . '_model_' . time() . '.' . $modelFile->getExtension();
        
        if ($modelFile->move($uploadPath, $fileName)) {
            $this->equipmentModel->update($equipmentId, [
                'model_file_path' => 'assets/uploads/3d_models/' . $fileName
            ]);
            return true;
        }

        return false;
    }

    protected function uploadMachineImage($fileName, $imageFile)
    {
        $uploadPath = ROOTPATH . 'public/assets/uploads/machine_image/';
        
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }
        
        if ($imageFile->move($uploadPath, $fileName)) {
            
            return true;
        }

        return false;
    }

    // AJAX Methods
    public function ajaxGetEquipment($id)
    {
        $equipment = $this->equipmentModel->getEquipmentWithAssemblies($id);

        if ($equipment) {
            return $this->response->setJSON(['success' => true, 'data' => $equipment]);
        } else {
            return $this->response->setJSON(['success' => false, 'message' => 'Equipment not found']);
        }
    }

    public function getAssembliesByEquipment($equipmentId)
    {
        $assemblies = $this->assemblyModel->where('equipment_id', $equipmentId)->findAll();
        return $this->response->setJSON($assemblies);
    }

    public function ajaxUpdateStatus()
    {
        $id = $this->request->getPost('id');
        $status = $this->request->getPost('status');

        if ($this->equipmentModel->update($id, ['status' => $status])) {
            return $this->response->setJSON(['success' => true, 'message' => 'Status updated successfully']);
        } else {
            return $this->response->setJSON(['success' => false, 'message' => 'Failed to update status']);
        }
    }

    public function datatableApi()
    {
        helper('table');
        
        $params = get_datatable_params($this->request);
        
        // Build query with filters
        $builder = $this->equipmentModel->builder();
        
        // Apply custom filters
        if ($status = $this->request->getPost('status')) {
            $builder->where('status', $status);
        }
        if ($type = $this->request->getPost('type')) {
            $builder->where('type', $type);
        }
        if ($location = $this->request->getPost('location')) {
            $builder->like('location', $location);
        }
        if ($installDate = $this->request->getPost('installation_date')) {
            $builder->where('DATE(installation_date)', $installDate);
        }
        
        // Apply search
        if ($params['search']) {
            $builder->groupStart()
                   ->like('name', $params['search'])
                   ->orLike('equipment_id', $params['search'])
                   ->orLike('manufacturer', $params['search'])
                   ->orLike('location', $params['search'])
                   ->groupEnd();
        }
        
        // Get total count
        $totalRecords = $this->equipmentModel->countAll();
        $filteredRecords = $builder->countAllResults(false);
        
        // Apply ordering
        $columns = ['equipment_id', 'name', 'type', 'location', 'status', 'manufacturer', 'installation_date'];
        if (isset($columns[$params['order_column']])) {
            $builder->orderBy($columns[$params['order_column']], $params['order_dir']);
        }
        
        // Apply pagination
        $data = $builder->limit($params['length'], $params['start'])->get()->getResultArray();
        
        // Format data
        $formattedData = [];
        foreach ($data as $row) {
            $statusClass = $row['status'] === 'operational' ? 'bg-green-100 text-green-800' : 
                          ($row['status'] === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800');
            
            $formattedData[] = [
                $row['equipment_id'] ?? 'N/A',
                '<a href="' . base_url('machine/show/' . $row['id']) . '" class="text-blue-600 hover:text-blue-800 font-medium">' . esc($row['name']) . '</a>',
                esc($row['type'] ?? 'N/A'),
                esc($row['location'] ?? 'N/A'),
                '<span class="px-2 py-1 text-xs font-medium rounded-full ' . $statusClass . '">' . ucfirst($row['status']) . '</span>',
                esc($row['manufacturer'] ?? 'N/A'),
                $row['installation_date'] ? date('M d, Y', strtotime($row['installation_date'])) : 'N/A',
                '<div class="flex space-x-2">
                    <a href="' . base_url('machine/show/' . $row['id']) . '" class="text-blue-600 hover:text-blue-800" title="View">
                        <i class="fas fa-eye"></i>
                    </a>
                    <a href="' . base_url('machine/edit/' . $row['id']) . '" class="text-green-600 hover:text-green-800" title="Edit">
                        <i class="fas fa-edit"></i>
                    </a>
                    <a href="' . base_url('machine/delete/' . $row['id']) . '" class="text-red-600 hover:text-red-800" title="Delete" onclick="return confirm(\'Are you sure?\')">  
                        <i class="fas fa-trash"></i>
                    </a>
                </div>'
            ];
        }
        
        return $this->response->setJSON([
            'draw' => intval($params['draw']),
            'recordsTotal' => $totalRecords,
            'recordsFiltered' => $filteredRecords,
            'data' => $formattedData
        ]);
    }
}