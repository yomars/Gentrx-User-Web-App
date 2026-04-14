<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * AuthenticationLog Model
 * 
 * Location: app/Models/AuthenticationLog.php
 * Database: authentication_log table
 * 
 * Purpose: Audit trail for all authentication attempts (login, signup, logout)
 * Used for: Compliance investigation, brute-force detection, security audit
 * 
 * Phase 3+: Created with patient auth migration
 */

class AuthenticationLog extends Model
{
    protected $table = 'authentication_log';

    // Disable auto-timestamps since we want explicit control
    public $timestamps = false;

    protected $fillable = [
        'patient_id',
        'login_identifier',
        'attempt_type',
        'status',
        'ip_address',
        'user_agent',
        'error_message',
        'attempted_at',
    ];

    protected $casts = [
        'attempted_at' => 'datetime',
    ];

    /**
     * Relationships
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Scopes
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'success');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeLogins($query)
    {
        return $query->where('attempt_type', 'login');
    }

    public function scopeSignups($query)
    {
        return $query->where('attempt_type', 'signup');
    }

    public function scopeForPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeInDays($query, $days = 30)
    {
        return $query->where('attempted_at', '>=', now()->subDays($days));
    }

    /**
     * Boot
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-set attempted_at on creation
        static::creating(function ($model) {
            $model->attempted_at = $model->attempted_at ?? now();
        });
    }
}
