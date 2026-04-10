<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\AssemblyModel;
use App\Models\EquipmentModel;
use App\Models\EquipmentCategoryModel;
use App\Models\AssemblyCategoryModel;
use App\Models\PartsModel;

class Assembly extends BaseController
{
    protected $assemblyModel;
    protected $equipmentModel;
    protected $assemblyCategoryModel;
    protected $partsModel;

    public function __construct()
    {
        $this->assemblyModel = new AssemblyModel();
        $this->equipmentModel = new EquipmentModel();
        $this->assemblyCategoryModel = new AssemblyCategoryModel();
        $this->partsModel = new PartsModel();

        helper('form');
        
        // Check authentication
        if (!session()->get('isLoggedIn')) {
            return redirect()->to('/auth/login');
        }
    }

    public function index()
    {
        $data = [
            'title' => 'Assembly Management - GTP Maintenance System',
            'assemblies' => $this->assemblyModel->getAssembliesByEquipment(),

        ];

        return view('assembly/index', $data);
    }

    /*list all assemblies*/
    public function assemblyLists($assemblyIds = ''): string
    {   
        if(empty($assemblyIds) || $assemblyIds == '') {

            $data = [
                'allAssemblies' => $this->assemblyModel->findAll(),
                'controller' => 'assembly',
                'assemblyCategoryModel' => $this->assemblyCategoryModel,
                'equipmentModel' => $this->equipmentModel,
                'partsModel' => $this->partsModel,
            ];

        } else {

            $assemblyIds = explode('-', $assemblyIds);

            $data = [
                'allAssemblies' => $this->assemblyModel->whereIn('id', $assemblyIds)->findAll(),
                'controller' => 'assembly',
                'assemblyCategoryModel' => $this->assemblyCategoryModel,
                'equipmentModel' => $this->equipmentModel,
                'partsModel' => $this->partsModel,
            ];
        }
        
        return view('backend/assembly/list_assembly', $data);
    }

    public function show($id)
    {
        $assembly = $this->assemblyModel->getAssemblyWithParts($id);

        if (!$assembly) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Assembly not found');
        }

        $data = [
            'title' => $assembly['name'] . ' - Assembly Details',
            'assembly' => $assembly,
            'controller' => 'assembly'
        ];

        return view('backend/assembly/single_assembly', $data);
    }

    public function create()
    {
        //$equipment = $this->equipmentModel->find($equipmentId);

        /*if (!$equipment) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Equipment not found');
        }*/

        if ($this->request->getMethod() === 'POST') {
            return $this->store();
        }

        $data = [
            'title' => 'Add New Assembly',
            'assemblyCategories' => $this->assemblyCategoryModel->findAll(),
            'allMachines' => $this->equipmentModel->findAll(),
            'controller' => 'assembly',
        ];

        return view('backend/assembly/add_assembly', $data);
    }

    public function store()
    {
        $rules = [
            'name' => 'required|max_length[200]',
            'equipment_id' => 'required|is_natural_no_zero',
            'assembly_id' => 'permit_empty|max_length[50]|is_unique[assemblies.assembly_id]',
            'image_file' => 'permit_empty|uploaded[image_file]|max_size[image_file,5120]|ext_in[image_file,jpg,jpeg,png,webp]'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $assemblyData = [
            'assembly_id' => $this->request->getPost('assembly_id'),
            'equipment_id' => $this->request->getPost('equipment_id'),
            'name' => $this->request->getPost('name'),
            'type' => $this->request->getPost('type'),
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
            'criticality' => $this->request->getPost('criticality') ?: '1',
            'maintenance_schedule' => $this->request->getPost('maintenance_schedule') ?: 'monthly',
            'expected_lifespan' => $this->request->getPost('expected_lifespan'),
            'installation_date' => $this->request->getPost('installation_date'),
            'status' => $this->request->getPost('status') ?: 'operational'
        ];

        $assemblyId = $this->assemblyModel->insert($assemblyData);

        if ($assemblyId) {

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

                    $fileName = 'assembly_' . $assemblyId . '_'.$view.'_' . time() . '.' . $imageFile->getExtension();

                    $filePath = 'assets/uploads/assembly_image/' . $fileName;
                    $response = $this->uploadAssemblyImage($fileName, $imageFile);

                    if($response) {
                        $counter++;

                        /*build the array*/
                        $filesPathsArray[$view] = $filePath;
                    }
                }   
            }


            /*do final update of the files paths in the database */
            $filesPathsJson = json_encode($filesPathsArray);
            $this->assemblyModel->update($assemblyId, [
                'image_file_path' => $filesPathsJson
            ]);

            session()->setFlashdata('success', 'Assembly added successfully!');
            return redirect()->to('/assembly/create?success=1');
        } else {
            session()->setFlashdata('error', 'Failed to add assembly. Please try again.');
            return redirect()->back()->withInput();
        }
    }

    protected function uploadAssemblyImage($fileName, $imageFile)
    {
        $uploadPath = ROOTPATH . 'public/assets/uploads/assembly_image/';
        
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
        $assembly = $this->assemblyModel->find($id);

        if (!$assembly) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Assembly not found');
        }

        if ($this->request->getMethod() === 'POST') {
            return $this->update($id);
        }

        $equipment = $this->equipmentModel->find($assembly['equipment_id']);

        $data = [
            'title' => 'Edit Assembly - ' . $assembly['name'],
            'assembly' => $assembly,
            'equipment' => $equipment
        ];

        return view('assembly/edit', $data);
    }

    public function update($id)
    {
        $assembly = $this->assemblyModel->find($id);

        if (!$assembly) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Assembly not found');
        }

        $rules = [
            'name' => 'required|max_length[200]',
            'equipment_id' => 'required|is_natural_no_zero'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $assemblyData = [
            'name' => $this->request->getPost('name'),
            'type' => $this->request->getPost('type'),
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
            'criticality' => $this->request->getPost('criticality') ?: '1',
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

    public function getPartsByAssembly($assemblyId)
    {
        $partsModel = new \App\Models\PartsModel();
        $parts = $partsModel->where('assembly_id', $assemblyId)->findAll();
        return $this->response->setJSON($parts);
    }
}