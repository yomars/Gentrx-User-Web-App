#!/usr/bin/env python3
"""
Patch all backend PHP files to use patient_code instead of patient_id
for the appointments table column.
"""

import os
import re
import shutil

BASE = '/opt/gentrx-api/app/Http/Controllers/Api/V1'

def patch_file(path, replacements, description):
    with open(path, 'r') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        if isinstance(old, str):
            content = content.replace(old, new)
        else:  # regex
            content = re.sub(old, new, content)
    if content == original:
        print(f'  NO CHANGES: {description} ({path})')
    else:
        backup = path + '.bak2'
        shutil.copy2(path, backup)
        with open(path, 'w') as f:
            f.write(content)
        print(f'  PATCHED: {description} ({path})')

# =========================================================
# 1. AppointmentController.php
# =========================================================
path = BASE + '/AppointmentController.php'

# In addData: after resolving $patientId (integer), look up patient_code
# $dataModel->patient_id = $patientId  →  look up patient_code and store it
# The JOINs: patients.id = appointments.patient_id → patients.patient_code = appointments.patient_code
# Also: appointments.patient_id filter in getData

replacements = [
    # Store patient_code on the appointment model
    (
        '$dataModel->patient_id = $patientId;',
        '$patientRec = PatientModel::where(\'id\', $patientId)->first();\n            $dataModel->patient_code = $patientRec ? $patientRec->patient_code : null;'
    ),
    # Invoice model still stores integer patientId (separate column in invoice table - leave as is)
    # But the read JOINs on appointments need updating
    (
        "->join(\"patients\", \"patients.id\", '=', 'appointments.patient_id')",
        "->join(\"patients\", \"patients.patient_code\", '=', 'appointments.patient_code')"
    ),
    (
        "->Join('patients', 'patients.id', '=', 'appointments.patient_id')",
        "->Join('patients', 'patients.patient_code', '=', 'appointments.patient_code')"
    ),
    (
        "->join('patients', 'patients.id', '=', 'appointments.patient_id')",
        "->join('patients', 'patients.patient_code', '=', 'appointments.patient_code')"
    ),
    # appointmentData->patient_id (after the join, the column is now patient_code)
    (
        '$patient_id = $appointmentData->patient_id;',
        '$patient_id = $appointmentData->patient_code;'
    ),
    # filter on appointments.patient_id in getData/getDataByDoctor
    (
        "->where('appointments.patient_id', '=', $request->patient_id )",
        "->where('appointments.patient_code', '=', $request->patient_id )"
    ),
]
patch_file(path, replacements, 'AppointmentController')

# =========================================================
# 2. NotificationCentralController.php
# =========================================================
path = BASE + '/NotificationCentralController.php'
replacements = [
    (
        "->join(\"patients\",\"patients.id\",'=','appointments.patient_id')",
        "->join(\"patients\",\"patients.patient_code\",'=','appointments.patient_code')"
    ),
    (
        "->join(\"patients\", \"patients.id\", '=', 'appointments.patient_id')",
        "->join(\"patients\", \"patients.patient_code\", '=', 'appointments.patient_code')"
    ),
]
patch_file(path, replacements, 'NotificationCentralController')

# =========================================================
# 3. AppointmentCancellationRedController.php
# =========================================================
path = BASE + '/AppointmentCancellationRedController.php'
replacements = [
    (
        "->join(\"patients\",\"patients.id\",'=','appointments.patient_id')",
        "->join(\"patients\",\"patients.patient_code\",'=','appointments.patient_code')"
    ),
    (
        "->join(\"patients\", \"patients.id\", '=', 'appointments.patient_id')",
        "->join(\"patients\", \"patients.patient_code\", '=', 'appointments.patient_code')"
    ),
    (
        '$patient_id=$appointmentData->patient_id;',
        '$patient_id=$appointmentData->patient_code;'
    ),
    (
        '$patient_id = $appointmentData->patient_id;',
        '$patient_id = $appointmentData->patient_code;'
    ),
]
patch_file(path, replacements, 'AppointmentCancellationRedController')

# =========================================================
# 4. AppointmentCheckinController.php
# =========================================================
path = BASE + '/AppointmentCheckinController.php'
replacements = [
    (
        "->join('patients', 'patients.id', '=', 'appointments.patient_id')",
        "->join('patients', 'patients.patient_code', '=', 'appointments.patient_code')"
    ),
]
patch_file(path, replacements, 'AppointmentCheckinController')

# =========================================================
# 5. PrescriptionController.php
# =========================================================
path = BASE + '/PrescriptionController.php'
replacements = [
    (
        "->LeftJoin('patients', 'patients.id', '=', 'appointments.patient_id')",
        "->LeftJoin('patients', 'patients.patient_code', '=', 'appointments.patient_code')"
    ),
]
patch_file(path, replacements, 'PrescriptionController')

# =========================================================
# 6. ZoomVideoCallController.php
# =========================================================
path = BASE + '/ZoomVideoCallController.php'
replacements = [
    (
        '$patientId=$appointmentModel->patient_id;',
        '$patientId=$appointmentModel->patient_code;'
    ),
    (
        '$patientId = $appointmentModel->patient_id;',
        '$patientId = $appointmentModel->patient_code;'
    ),
]
patch_file(path, replacements, 'ZoomVideoCallController')

# =========================================================
# 7. AppointmentModel.php
# =========================================================
model_path = '/opt/gentrx-api/app/Models/AppointmentModel.php'
if os.path.exists(model_path):
    with open(model_path, 'r') as f:
        model_content = f.read()
    if 'patient_id' in model_content:
        patched = model_content.replace("'patient_id'", "'patient_code'")
        if patched != model_content:
            shutil.copy2(model_path, model_path + '.bak2')
            with open(model_path, 'w') as f:
                f.write(patched)
            print(f'  PATCHED: AppointmentModel fillable ({model_path})')
        else:
            print(f'  NO CHANGES (string match failed): AppointmentModel')
    else:
        print(f'  patient_id not found in fillable: AppointmentModel')
else:
    # Try alternate path
    alt = '/opt/gentrx-api/app/Models/Appointment.php'
    print(f'  Model not found at {model_path}, tried {alt}')

print('\nAll patches applied.')
