<?php

namespace App\Helpers;

class InputValidator
{
    /**
     * Sanitize string input
     */
    public static function sanitizeString($input, $maxLength = 255): string
    {
        if (!is_string($input)) {
            return '';
        }
        
        $input = trim($input);
        $input = strip_tags($input);
        $input = htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
        
        return substr($input, 0, $maxLength);
    }
    
    /**
     * Validate and sanitize integer
     */
    public static function sanitizeInt($input): ?int
    {
        if (!is_numeric($input)) {
            return null;
        }
        
        return (int)$input;
    }
    
    /**
     * Validate email
     */
    public static function validateEmail($email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    /**
     * Validate plant ID access
     */
    public static function validatePlantId($plantId, array $allowedPlantIds): bool
    {
        $plantId = self::sanitizeInt($plantId);
        
        if ($plantId === null) {
            return false;
        }
        
        return in_array($plantId, $allowedPlantIds, true);
    }
    
    /**
     * Sanitize array of IDs
     */
    public static function sanitizeIds(array $ids): array
    {
        return array_filter(array_map('intval', $ids), fn($id) => $id > 0);
    }
    
    /**
     * Validate date format
     */
    public static function validateDate($date, $format = 'Y-m-d'): bool
    {
        $d = \DateTime::createFromFormat($format, $date);
        return $d && $d->format($format) === $date;
    }
    
    /**
     * Sanitize filename
     */
    public static function sanitizeFilename($filename): string
    {
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);
        return substr($filename, 0, 255);
    }
    
    /**
     * Validate enum value
     */
    public static function validateEnum($value, array $allowedValues): bool
    {
        return in_array($value, $allowedValues, true);
    }
}
