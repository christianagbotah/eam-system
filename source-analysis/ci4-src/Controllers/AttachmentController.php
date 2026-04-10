<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class AttachmentController extends ResourceController
{
    use ResponseTrait;

    protected $modelName = 'App\Models\AttachmentModel';
    protected $format = 'json';

    public function getByEntity($entityType, $entityId)
    {
        $attachments = $this->model
            ->select('attachments.*, users.username as uploaded_by')
            ->join('users', 'users.id = attachments.user_id', 'left')
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->orderBy('created_at', 'DESC')
            ->findAll();

        return $this->respond(['status' => 'success', 'data' => $attachments]);
    }

    public function upload()
    {
        $file = $this->request->getFile('file');
        $entityType = $this->request->getPost('entity_type');
        $entityId = $this->request->getPost('entity_id');
        $userId = $this->request->getPost('user_id');

        if (!$file || !$file->isValid()) {
            return $this->fail('Invalid file upload', 400);
        }

        if ($file->getSize() > 10485760) { // 10MB
            return $this->fail('File size exceeds 10MB limit', 400);
        }

        $newName = $file->getRandomName();
        $file->move(WRITEPATH . 'uploads', $newName);

        $data = [
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'file_name' => $file->getClientName(),
            'file_path' => 'uploads/' . $newName,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getClientMimeType(),
            'user_id' => $userId
        ];

        $id = $this->model->insert($data);
        return $this->respondCreated(['status' => 'success', 'message' => 'File uploaded', 'id' => $id]);
    }

    public function download($id)
    {
        $attachment = $this->model->find($id);
        if (!$attachment) {
            return $this->failNotFound('Attachment not found');
        }

        $filePath = WRITEPATH . $attachment['file_path'];
        if (!file_exists($filePath)) {
            return $this->failNotFound('File not found');
        }

        return $this->response->download($filePath, null)->setFileName($attachment['file_name']);
    }

    public function delete($id = null)
    {
        $attachment = $this->model->find($id);
        if (!$attachment) {
            return $this->failNotFound('Attachment not found');
        }

        $filePath = WRITEPATH . $attachment['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        $this->model->delete($id);
        return $this->respondDeleted(['status' => 'success', 'message' => 'Attachment deleted']);
    }
}
