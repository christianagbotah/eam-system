<?php

namespace App\Services\Asset;

use App\Models\PartMediaModel;
use CodeIgniter\Files\File;

class MediaService
{
    protected $partMediaModel;

    public function __construct()
    {
        $this->partMediaModel = new PartMediaModel();
    }

    public function uploadPartMedia($partId, $file, $type = 'image')
    {
        if (!$file->isValid()) {
            throw new \Exception('Invalid file');
        }

        $newName = $file->getRandomName();
        $uploadPath = WRITEPATH . 'uploads/parts/media/';
        
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }
        
        $file->move($uploadPath, $newName);

        $mediaData = [
            'part_id' => $partId,
            'media_type' => $type,
            'file_path' => 'uploads/parts/media/' . $newName
        ];

        // Generate thumbnail for images
        if ($type === 'image') {
            $mediaData['thumbnail_path'] = $this->generateThumbnail($uploadPath . $newName);
        }

        return $this->partMediaModel->insert($mediaData);
    }

    public function getPartMedia($partId)
    {
        return $this->partMediaModel->where('part_id', $partId)->findAll();
    }

    public function deleteMedia($mediaId)
    {
        $media = $this->partMediaModel->find($mediaId);
        if (!$media) {
            throw new \Exception('Media not found');
        }

        // Delete files
        $filePath = WRITEPATH . $media['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        if ($media['thumbnail_path']) {
            $thumbnailPath = WRITEPATH . $media['thumbnail_path'];
            if (file_exists($thumbnailPath)) {
                unlink($thumbnailPath);
            }
        }

        return $this->partMediaModel->delete($mediaId);
    }

    private function generateThumbnail($imagePath)
    {
        // Simple thumbnail generation
        $thumbnailPath = str_replace('/media/', '/media/thumbs/', $imagePath);
        $thumbnailDir = dirname($thumbnailPath);
        
        if (!is_dir($thumbnailDir)) {
            mkdir($thumbnailDir, 0755, true);
        }

        // Use GD library to create thumbnail
        if (extension_loaded('gd')) {
            $imageInfo = getimagesize($imagePath);
            if ($imageInfo) {
                $width = $imageInfo[0];
                $height = $imageInfo[1];
                $type = $imageInfo[2];

                $thumbWidth = 150;
                $thumbHeight = 150;

                $thumb = imagecreatetruecolor($thumbWidth, $thumbHeight);

                switch ($type) {
                    case IMAGETYPE_JPEG:
                        $source = imagecreatefromjpeg($imagePath);
                        break;
                    case IMAGETYPE_PNG:
                        $source = imagecreatefrompng($imagePath);
                        break;
                    case IMAGETYPE_GIF:
                        $source = imagecreatefromgif($imagePath);
                        break;
                    default:
                        return null;
                }

                imagecopyresampled($thumb, $source, 0, 0, 0, 0, $thumbWidth, $thumbHeight, $width, $height);

                switch ($type) {
                    case IMAGETYPE_JPEG:
                        imagejpeg($thumb, $thumbnailPath);
                        break;
                    case IMAGETYPE_PNG:
                        imagepng($thumb, $thumbnailPath);
                        break;
                    case IMAGETYPE_GIF:
                        imagegif($thumb, $thumbnailPath);
                        break;
                }

                imagedestroy($thumb);
                imagedestroy($source);

                return str_replace(WRITEPATH, '', $thumbnailPath);
            }
        }

        return null;
    }
}