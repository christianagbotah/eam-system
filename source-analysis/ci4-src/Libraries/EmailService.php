<?php
namespace App\Libraries;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class EmailService
{
    private $mail;

    public function __construct()
    {
        $this->mail = new PHPMailer(true);
        
        // SMTP Configuration
        $this->mail->isSMTP();
        $this->mail->Host = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
        $this->mail->SMTPAuth = true;
        $this->mail->Username = getenv('SMTP_USERNAME') ?: 'your-email@gmail.com';
        $this->mail->Password = getenv('SMTP_PASSWORD') ?: 'your-app-password';
        $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $this->mail->Port = getenv('SMTP_PORT') ?: 465;
        $this->mail->SMTPDebug = 0;
        
        // Default sender
        $this->mail->setFrom(getenv('SMTP_FROM') ?: 'noreply@ifactory.com', 'iFactory EAM System');
    }

    public function sendPasswordReset($email, $token)
    {
        try {
            $this->mail->addAddress($email);
            $this->mail->isHTML(true);
            $this->mail->Subject = 'Password Reset Request - iFactory EAM System';
            
            $resetLink = getenv('APP_URL') . "/reset-password?token=" . $token;
            
            $this->mail->Body = "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <div style='background: linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%); padding: 30px; text-align: center;'>
                        <h1 style='color: white; margin: 0;'>iFactory EAM System</h1>
                    </div>
                    <div style='padding: 40px; background: #f9fafb;'>
                        <h2 style='color: #1e293b;'>Password Reset Request</h2>
                        <p style='color: #64748b; line-height: 1.6;'>
                            You requested to reset your password. Click the button below to reset it:
                        </p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{$resetLink}' style='background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;'>
                                Reset Password
                            </a>
                        </div>
                        <p style='color: #64748b; font-size: 14px;'>
                            This link will expire in 1 hour. If you didn't request this, please ignore this email.
                        </p>
                        <p style='color: #94a3b8; font-size: 12px; margin-top: 30px;'>
                            Or copy this link: <br>
                            <span style='word-break: break-all;'>{$resetLink}</span>
                        </p>
                    </div>
                    <div style='background: #1e293b; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;'>
                        © " . date('Y') . " iFactory EAM System. All rights reserved.
                    </div>
                </div>
            ";
            
            $this->mail->AltBody = "Password Reset Request\n\nClick this link to reset your password: {$resetLink}\n\nThis link expires in 1 hour.";
            
            $this->mail->send();
            return true;
        } catch (Exception $e) {
            error_log('Email send failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
