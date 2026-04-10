<?php

namespace App\Services\ProductionSurvey;

use App\Models\ProductionSurveyAttachmentModel;

class AttachmentService
{
    protected $attachmentModel;
    protected $uploadPath = WRITEPATH . 'uploads/production_surveys/';

    public function __construct()
    {
        $this->attachmentModel = new ProductionSurveyAttachmentModel();
        
        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }

    public function uploadAttachment(int $surveyId, $file)
    {
        if (!$file->isValid()) {
            throw new \Exception('Invalid file upload');
        }

        $fileName = $file->getRandomName();
        $file->move($this->uploadPath, $fileName);
        
        $filePath = $this->uploadPath . $fileName;
        $thumbnailPath = null;
        
        if (in_array($file->getClientMimeType(), ['image/jpeg', 'image/png', 'image/jpg'])) {
            $thumbnailPath = $this->createThumbnail($filePath);
        }
        
        return $this->attachmentModel->insert([
            'survey_id' => $surveyId,
            'file_path' => $filePath,
            'thumbnail_path' => $thumbnailPath,
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize()
        ]);
    }

    protected function createThumbnail(string $filePath): string
    {
        $image = \Config\Services::image()
            ->withFile($filePath)
            ->resize(200, 200, true, 'center')
            ->save($filePath . '_thumb.jpg');
        
        return $filePath . '_thumb.jpg';
    }

    public function deleteAttachment(int $attachmentId)
    {
        $attachment = $this->attachmentModel->find($attachmentId);
        
        if ($attachment) {
            if (file_exists($attachment['file_path'])) {
                unlink($attachment['file_path']);
            }
            if ($attachment['thumbnail_path'] && file_exists($attachment['thumbnail_path'])) {
                unlink($attachment['thumbnail_path']);
            }
            
            return $this->attachmentModel->delete($attachmentId);
        }
        
        return false;
    }
}
