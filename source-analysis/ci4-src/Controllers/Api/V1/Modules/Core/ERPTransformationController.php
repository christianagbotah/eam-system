<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class ERPTransformationController extends ResourceController
{
    protected $modelName = 'App\Models\ERPTransformationModel';
    protected $format = 'json';

    public function index()
    {
        $transformations = $this->model->orderBy('entity_type', 'ASC')->findAll();
        return $this->respond(['status' => 'success', 'data' => $transformations]);
    }

    public function show($id = null)
    {
        $transformation = $this->model->find($id);
        if (!$transformation) {
            return $this->failNotFound('Transformation not found');
        }
        return $this->respond(['status' => 'success', 'data' => $transformation]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        
        if ($this->model->insert($data)) {
            $id = $this->model->getInsertID();
            return $this->respondCreated(['status' => 'success', 'data' => $this->model->find($id)]);
        }
        
        return $this->fail($this->model->errors());
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        
        if ($this->model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'data' => $this->model->find($id)]);
        }
        
        return $this->fail($this->model->errors());
    }

    public function delete($id = null)
    {
        if ($this->model->delete($id)) {
            return $this->respondDeleted(['status' => 'success', 'message' => 'Transformation deleted']);
        }
        return $this->failNotFound('Transformation not found');
    }

    public function transform($value, $transformationId)
    {
        $transformation = $this->model->find($transformationId);
        if (!$transformation || !$transformation['is_active']) {
            return $value;
        }

        $rule = json_decode($transformation['transformation_rule'], true);

        switch ($transformation['transformation_type']) {
            case 'value_map':
                return $rule[$value] ?? $value;

            case 'formula':
                $expression = str_replace('value', $value, $rule['expression']);
                return eval("return $expression;");

            case 'concat':
                return implode($rule['separator'], array_map(fn($f) => $value[$f] ?? '', $rule['fields']));

            case 'split':
                $parts = explode($rule['delimiter'], $value);
                return $parts[$rule['index']] ?? $value;

            case 'date_format':
                $date = \DateTime::createFromFormat($rule['from'], $value);
                return $date ? $date->format($rule['to']) : $value;

            default:
                return $value;
        }
    }
}
