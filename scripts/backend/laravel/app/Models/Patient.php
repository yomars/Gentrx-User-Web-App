<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Patient Model
 * 
 * Location: app/Models/Patient.php
 * Database: patients table
 * 
 * Phase 3+: Now handles patient authentication in addition to profile data
 * Backwards compatible: New auth columns are nullable, legacy patients work unchanged
 * 
 * Key Relationships:
 * - hasMany appointments
 * - hasMany lab_requests  
 * - hasMany family_members
 * - hasMany authentication_logs (Phase 3+)
 */

class Patient extends Authenticatable
{
    use SoftDeletes;

    protected $table = 'patients';

    protected $fillable = [
        // Legacy fields (existing)
        'phone',
        'name',
        'f_name',
        'l_name',
        'email',
        'gender',
        'dob',
        'isd_code',
        'image',
        'image_path',
        'image_mime',
        'image_size',
        'image_checksum',
        'created_by',
        'referred_by',

        // Phase 3+ Auth fields (NEW, nullable for backward compatibility)
        'password_hash',
        'api_token',
        'login_attempts',
        'locked_until',
        'auth_status',
        'last_login_at',
        'credential_setup_at',

        // Patient code fields (Phase 4+, nullable for backward compatibility)
        'clinic_code',
        'patient_sequence',
        'patient_code',
    ];

    protected $hidden = [
        'password_hash',
        'api_token',
        'login_attempts',
        'locked_until',
    ];

    protected $casts = [
        'dob' => 'date',
        'last_login_at' => 'datetime',
        'credential_setup_at' => 'datetime',
        'locked_until' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relationships
     */
    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function labRequests()
    {
        return $this->hasMany(LabRequest::class);
    }

    public function familyMembers()
    {
        return $this->hasMany(FamilyMember::class);
    }

    public function authenticationLogs()
    {
        return $this->hasMany(AuthenticationLog::class);
    }

    public function wallet()
    {
        return $this->hasOne(Wallet::class);
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('auth_status', 'active');
    }

    public function scopeLocked($query)
    {
        return $query->where('locked_until', '>', now());
    }

    public function scopeWithAuthCredentials($query)
    {
        return $query->whereNotNull('password_hash');
    }

    /**
     * Accessors & Mutators
     */
    public function getIsLockedAttribute()
    {
        return $this->locked_until && now()->lessThan($this->locked_until);
    }

    public function getHasPasswordAttribute()
    {
        return !is_null($this->password_hash);
    }

    /**
     * Methods
     */
    public function isAuthenticationEnabled()
    {
        return !is_null($this->credential_setup_at);
    }

    public function getLoginAttemptsRemaining()
    {
        return max(0, 5 - ($this->login_attempts ?? 0));
    }

    public function lockAccount()
    {
        $this->update([
            'locked_until' => now()->addMinutes(30),
            'login_attempts' => 5,
        ]);
    }

    public function unlockAccount()
    {
        $this->update([
            'locked_until' => null,
            'login_attempts' => 0,
        ]);
    }
}
