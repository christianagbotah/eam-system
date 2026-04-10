<?php

namespace App\Services;

use App\Models\WorkOrderAttachment;
use CodeIgniter\Database\ConnectionInterface;

class AttachmentService
{
    protected $db;
    protected $attachmentModel;
    protected $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    protected $maxSize = 10 * 1024 * 1024; // 10MB

    public function __construct(ConnectionInterface $db = null)
    {
        $this->db = $db ?? \Config\Database::connect();
        $this->attachmentModel = new WorkOrderAttachment();
    }

    public function upload(int $woId, array $files, int $userId): array
    {
        $uploadPath = WRITEPATH . "wo_attachments/$woId/";
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }

        $uploaded = [];

        foreach ($files as $file) {
            if (!$file->isValid()) continue;

            // Validate file
            if (!$this->validateFile($file)) {
                continue;
            }

            // Generate unique filename
            $filename = uniqid() . '_' . $file->getName();
            $file->move($uploadPath, $filename);

            // Generate thumbnail for images
            $thumbnailPath = null;
            if (strpos($file->getMimeType(), 'image/') === 0) {
                $thumbnailPath = $this->generateThumbnail($uploadPath . $filename);
            }

            // Save to database
            $attachmentData = [
                'work_order_id' => $woId,
                'user_id' => $userId,
                'filename' => $filename,
                'original_name' => $file->getName(),
                'file_path' => $uploadPath . $filename,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'thumbnail_path' => $thumbnailPath
            ];

            $this->attachmentModel->insert($attachmentData);
            $uploaded[] = array_merge($attachmentData, ['id' => $this->attachmentModel->getInsertID()]);
        }

        return $uploaded;
    }

    public function getByWorkOrder(int $woId): array
    {
        return $this->attachmentModel
            ->select('work_order_attachments.*, users.username')
            ->join('users', 'users.id = work_order_attachments.uploaded_by', 'left')
            ->where('work_order_id', $woId)
            ->orderBy('created_at', 'DESC')
            ->findAll();
    }

    public function delete(int $attachmentId): void
    {
        $attachment = $this->attachmentModel->find($attachmentId);
        if (!$attachment) {
            throw new \Exception('Attachment not found');
        }

        // Delete files
        if (file_exists($attachment['file_path'])) {
            unlink($attachment['file_path']);
        }

        if ($attachment['thumbnail_path'] && file_exists($attachment['thumbnail_path'])) {
            unlink($attachment['thumbnail_path']);
        }

        // Delete database record
        $this->attachmentModel->delete($attachmentId);
    }

    public function getSecureUrl(int $attachmentId): string
    {
        $attachment = $this->attachmentModel->find($attachmentId);
        if (!$attachment) {
            throw new \Exception('Attachment not found');
        }

        // Generate secure token for file access
        $token = hash('sha256', $attachmentId . time() . 'secret_key');
        
        return base_url("api/v1/eam/attachments/$attachmentId/download?token=$token");
    }

    protected function validateFile($file): bool
    {
        if (!in_array($file->getMimeType(), $this->allowedTypes)) {
            return false;
        }

        if ($file->getSize() > $this->maxSize) {
            return false;
        }

        return true;
    }

    protected function generateThumbnail(string $imagePath): ?string
    {
        try {
            $image = \Config\Services::image();
            $thumbnailPath = dirname($imagePath) . '/thumb_' . basename($imagePath);
            
            $image->withFile($imagePath)
                  ->resize(200, 200, true)
                  ->save($thumbnailPath);
            
            return $thumbnailPath;
        } catch (\Exception $e) {
            return null;
        }
    }
}