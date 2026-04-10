<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class DocumentsController extends ResourceController
{
    protected $modelName = 'App\Models\DocumentModel';
    protected $format = 'json';

    public function index()
    {
        $builder = $this->model->orderBy('created_at', 'DESC');
        
        if ($category = $this->request->getGet('category')) {
            $builder->where('category', $category);
        }
        
        if ($search = $this->request->getGet('search')) {
            $builder->like('title', $search);
        }
        
        $documents = $builder->findAll();
        return $this->respond(['status' => 'success', 'data' => $documents]);
    }

    public function show($id = null)
    {
        $document = $this->model->find($id);
        if (!$document) {
            return $this->failNotFound('Document not found');
        }
        return $this->respond(['status' => 'success', 'data' => $document]);
    }

    public function upload()
    {
        $file = $this->request->getFile('file');
        
        if (!$file->isValid()) {
            return $this->fail('Invalid file');
        }

        $newName = $file->getRandomName();
        $file->move(WRITEPATH . 'uploads', $newName);

        $data = [
            'title' => $this->request->getPost('title'),
            'category' => $this->request->getPost('category'),
            'file_name' => $file->getClientName(),
            'file_path' => WRITEPATH . 'uploads/' . $newName,
            'file_size' => $file->getSize(),
            'file_type' => $file->getClientMimeType(),
            'asset_id' => $this->request->getPost('asset_id') ?: null,
            'uploaded_by' => 1,
            'version' => '1.0',
            'status' => 'draft'
        ];

        if ($this->model->insert($data)) {
            return $this->respondCreated(['status' => 'success', 'message' => 'Document uploaded']);
        }

        return $this->fail($this->model->errors());
    }

    public function download($id = null)
    {
        $document = $this->model->find($id);
        
        if (!$document) {
            return $this->failNotFound('Document not found');
        }

        return $this->response->download($document['file_path'], null)->setFileName($document['file_name']);
    }

    public function newVersion($id = null)
    {
        $document = $this->model->find($id);
        if (!$document) {
            return $this->failNotFound('Document not found');
        }

        $file = $this->request->getFile('file');
        if (!$file->isValid()) {
            return $this->fail('Invalid file');
        }

        $newName = $file->getRandomName();
        $file->move(WRITEPATH . 'uploads', $newName);

        $db = \Config\Database::connect();
        
        $db->table('document_versions')->insert([
            'document_id' => $id,
            'version' => $this->request->getPost('version'),
            'file_name' => $file->getClientName(),
            'file_path' => WRITEPATH . 'uploads/' . $newName,
            'file_size' => $file->getSize(),
            'uploaded_by' => 1,
            'change_notes' => $this->request->getPost('change_notes')
        ]);

        $this->model->update($id, [
            'version' => $this->request->getPost('version'),
            'file_name' => $file->getClientName(),
            'file_path' => WRITEPATH . 'uploads/' . $newName,
            'file_size' => $file->getSize()
        ]);

        return $this->respond(['status' => 'success', 'message' => 'New version uploaded']);
    }

    public function requestApproval($id = null)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $db->table('document_approvals')->insert([
            'document_id' => $id,
            'approver_id' => $data['approver_id'],
            'status' => 'pending'
        ]);

        $this->model->update($id, ['status' => 'pending_approval']);

        return $this->respond(['status' => 'success', 'message' => 'Approval requested']);
    }

    public function approve($id = null)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $db->table('document_approvals')
            ->where('document_id', $id)
            ->update([
                'status' => 'approved',
                'comments' => $data['comments'] ?? null
            ]);

        $this->model->update($id, [
            'status' => 'approved',
            'approved_by' => 1,
            'approved_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respond(['status' => 'success', 'message' => 'Document approved']);
    }
}
