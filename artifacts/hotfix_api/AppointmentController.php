<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AppointmentModel;
use App\Models\AppointmentInvoiceModel;
use App\Models\AppointmentPaymentModel;
use App\Models\AppointmentStatusLogModel;
use App\Models\AppointmentInvoiceItemModel;
use App\Models\AllTransactionModel;
use App\Models\User;
use App\Models\FamilyMembersModel;
use App\Models\PatientModel;
use Illuminate\Support\Facades\Validator;
use App\CentralLogics\Helpers;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Http\Controllers\Api\V1\ZoomVideoCallController;
use App\Models\CouponUseModel;
use App\Http\Controllers\Api\V1\NotificationCentralController;
use App\Models\PatientClinicModel;


class AppointmentController extends Controller
{
    //update status to paid
    function updateStatusToPaid(Request $request)
    {


        $validator = Validator::make(request()->all(), [
            'appointment_id' => 'required',
            "payment_method" => 'required'


        ]);
        if ($validator->fails())
            return response(["response" => 400], 400);

        try {
            DB::beginTransaction();
            $appointment_id = $request->appointment_id;
            $timeStamp = date("Y-m-d H:i:s");
            $date = date("Y-m-d");

            $dataInvoiceModel = AppointmentInvoiceModel::where('appointment_id', $appointment_id)->first();

            if ($dataInvoiceModel == null) {
                throw new \Exception('Error');
            }
            $dataTXNModel = new AllTransactionModel;
            $dataTXNModel->amount  = $dataInvoiceModel->total_amount;
            $dataTXNModel->user_id  = $dataInvoiceModel->user_id;
            $dataTXNModel->patient_id  = $dataInvoiceModel->patient_id;
            $dataTXNModel->clinic_id  = $dataInvoiceModel->clinic_id;
            $dataTXNModel->transaction_type = "Debited";
            $dataTXNModel->created_at = $timeStamp;
            $dataTXNModel->updated_at = $timeStamp;

            $qResponceTxn = $dataTXNModel->save();
            if (!$qResponceTxn) {
                DB::rollBack();
                return Helpers::errorResponse("error");
            }

            $dataPaymentModel = new AppointmentPaymentModel;
            $dataPaymentModel->txn_id = $dataTXNModel->id;
            $dataPaymentModel->invoice_id   = $dataInvoiceModel->id;
            $dataPaymentModel->amount   = $dataInvoiceModel->total_amount;
            $dataPaymentModel->payment_time_stamp   = $timeStamp;
            $dataPaymentModel->clinic_id  = $dataInvoiceModel->clinic_id;
            $dataPaymentModel->payment_method   = $request->payment_method;
            $dataPaymentModel->created_at = $timeStamp;
            $dataPaymentModel->updated_at = $timeStamp;
            $qResponcePayment = $dataPaymentModel->save();

            $dataTXNModel->appointment_id = $appointment_id;
            $dataTXNModel->save();

            $dataInvoiceModel->status = "Paid";
            $resDataInvoiceModel = $dataInvoiceModel->save();
            if (!$resDataInvoiceModel) {
                DB::rollBack();
                return Helpers::errorResponse("error");
            }

            $appModel = AppointmentModel::where("id", $appointment_id)->first();
            $appModel->payment_status = "Paid";
            $resAppModel = $appModel->save();
            if (!$resAppModel) {
                DB::rollBack();
                return Helpers::errorResponse("error");
            }

            DB::commit();
            return Helpers::successWithIdResponse("successfully", $appointment_id);
        } catch (\Exception $e) {
            DB::rollBack();

            return Helpers::errorResponse("error");
        }
    }

    //add new data
    function addData(Request $request)
    {

        $validator = Validator::make(request()->all(), [
            'status' => 'required',
            'date' => 'required',
            'time_slots' => 'required',
            'doct_id' => 'required',
            'dept_id' => 'required',
            'type' => 'required',
            'payment_status' => 'required',
            'total_amount' => 'required',
            'fee' => 'required',
            'service_charge' => 'required',
            'invoice_description' => 'required'

        ]);

        if ($validator->fails())
            return response(["response" => 400], 400);

        try {
            DB::beginTransaction();
            $timeStamp = date("Y-m-d H:i:s");
            $date = date("Y-m-d");
            if (isset($request->family_member_id) && isset($request->patient_id)) {
                DB::rollBack();
                return Helpers::errorResponse("error");
            }

            $doctModel =  DB::table("doctors")
            ->select( 'doctors.clinic_id')
            ->where('doctors.user_id', '=', $request->doct_id)
            ->first();

            $clinicId=$doctModel->clinic_id??null;

            if ($doctModel == null||$clinicId==null) {
                DB::rollBack();
                return Helpers::errorResponse("error");
            }

            $patientId = $request->patient_id;

            // Handle patient_code string passed as patient_id (new PatientAuth flow)
            if (isset($patientId) && !is_numeric($patientId)) {
                $resolvedPatient = PatientModel::where('patient_code', $patientId)->first();
                if (!$resolvedPatient) {
                    DB::rollBack();
                    return Helpers::errorResponse("patient not found");
                }
                $patientId = $resolvedPatient->id;
            }

            if (!isset($request->patient_id)) {
                if (!isset($request->family_member_id)) {

                    DB::rollBack();
                    return Helpers::errorResponse("error");
                }
                $dataFamilyModel = FamilyMembersModel::where('id', $request->family_member_id)->first();
                if ($dataFamilyModel == null) {
                    DB::rollBack();
                    return Helpers::errorResponse("error");
                }
                $dataPatientModelExists = PatientModel::where('f_name', $dataFamilyModel->f_name)
                    ->where('l_name', $dataFamilyModel->l_name)
                    ->where('phone', $dataFamilyModel->phone)
                    ->where('clinic_id', $clinicId)
                    ->first();
                if ($dataPatientModelExists == null) {
                    $dataPatientModel = new PatientModel;
                    $dataPatientModel->f_name = $dataFamilyModel->f_name;
                    $dataPatientModel->l_name = $dataFamilyModel->l_name;
                    $dataPatientModel->phone = $dataFamilyModel->phone;
                    $dataPatientModel->user_id = $dataFamilyModel->user_id;
                    $dataPatientModel->isd_code = $dataFamilyModel->isd_code;
                    $dataPatientModel->dob = $dataFamilyModel->dob;
                    $dataPatientModel->clinic_id = $clinicId;
                    $dataPatientModel->gender = $dataFamilyModel->gender;
                    $resPatient = $dataPatientModel->save();
                    if (!$resPatient) {
                        DB::rollBack();
                        return Helpers::errorResponse("error");
                    }

                    $patientId = $dataPatientModel->id;

                    // $dataPatientClinicModel = new PatientClinicModel;
                    // $dataPatientClinicModel->patient_id = $patientId;
                    // $dataPatientClinicModel->clinic_id = $clinicId;
                    // $dataPatientClinicModel->save();
                } else {
                      $patientId = $dataPatientModelExists->id;
                    // $dataPatientModelExistsP = PatientClinicModel::where('clinic_id', $clinicId)
                    // ->where('patient_id', $patientId)
                    // ->first();
                    // if(!$dataPatientModelExistsP){
                    //     $patientId = $dataPatientModelExists->id;
                    //     $dataPatientClinicModel = new PatientClinicModel;
                    //     $dataPatientClinicModel->patient_id = $patientId;
                    //     $dataPatientClinicModel->clinic_id = $clinicId;
                    //     $dataPatientClinicModel->save();
                    // }

                }
            }

            if (isset($request->payment_transaction_id)) {


                $dataTXNModel = new AllTransactionModel;
                $dataTXNModel->payment_transaction_id = $request->payment_transaction_id;
                $dataTXNModel->amount  = $request->total_amount;
                $dataTXNModel->user_id  = $request->user_id;
                $dataTXNModel->patient_id  = $patientId;
                $dataTXNModel->clinic_id = $clinicId;
                $dataTXNModel->transaction_type = "Debited";
                $dataTXNModel->created_at = $timeStamp;
                $dataTXNModel->updated_at = $timeStamp;
                $dataTXNModel->is_wallet_txn = $request->is_wallet_txn ?? 0;
                $qResponceTxn = $dataTXNModel->save();
                if (!$qResponceTxn) {
                    DB::rollBack();
                    return Helpers::errorResponse("error");
                }
                if ($request->is_wallet_txn) {

                    // Always deduct from the appointment's resolved patient record.
                    $patientRecord = PatientModel::where('id', $patientId)->first();
                    if (!$patientRecord || !$patientRecord->patient_code) {
                        DB::rollBack();
                        return Helpers::errorResponse("error");
                    }
                    $walletQuery = DB::table('wallets');
                    if (Schema::hasColumn('wallets', 'patient_code')) {
                        $walletQuery->where('patient_code', $patientRecord->patient_code);
                    } else {
                        $walletQuery->where('owner_id', $patientRecord->patient_code);
                        if (Schema::hasColumn('wallets', 'owner_type')) {
                            $walletQuery->where('owner_type', 'patient');
                        }
                    }

                    $walletRecord = $walletQuery->orderByDesc('id')->first();
                    if (!$walletRecord) {
                        DB::rollBack();
                        return Helpers::errorResponse("error");
                    }
                    $userOldAmount = (float) ($walletRecord->balance ?? 0);
                    $deductAmount = (float) $request->total_amount;
                    if ($userOldAmount < $deductAmount) {
                        DB::rollBack();
                        return Helpers::errorResponse("Insufficient amount in wallet");
                    }

                    $userNewAmount = $userOldAmount - $deductAmount;
                    $qResponceWU = DB::table('wallets')
                        ->where('id', $walletRecord->id)
                        ->update(['balance' => $userNewAmount, 'updated_at' => $timeStamp]);
                    if (!$qResponceWU) {
                        DB::rollBack();
                        return Helpers::errorResponse("error");
                    }

                    $dataTXNModel->last_wallet_amount = $userOldAmount;
                    $dataTXNModel->new_wallet_amount = $userNewAmount;
                    $qResponceTxnWalletUpdate = $dataTXNModel->save();
                    if (!$qResponceTxnWalletUpdate) {
                        DB::rollBack();
                        return Helpers::errorResponse("error");
                    }
                }
            }

            $dataModel = new AppointmentModel;

            $patientRecord = PatientModel::where('id', $patientId)->first();
            $patientCode = $patientRecord ? $patientRecord->patient_code : null;
            if (!$patientCode) {
                DB::rollBack();
                return Helpers::errorResponse("patient_code not found");
            }

            $dataModel->patient_code = $patientCode;
            $dataModel->status = $request->status;
            $dataModel->date = $request->date;
            $dataModel->time_slots = $request->time_slots;
            $dataModel->doct_id = $request->doct_id;
            $dataModel->dept_id = $request->dept_id;
            $dataModel->clinic_id = $clinicId;
            $dataModel->type = $request->type;
            $dataModel->source = $request->source;
            $dataModel->payment_status = $request->payment_status;
            if (isset($request->meeting_id)) {
                $dataModel->meeting_id = $request->meeting_id;
            }
            if (isset($request->meeting_link)) {
                $dataModel->meeting_link = $request->meeting_link;
            }
            if (isset($request->concern)) {
                $dataModel->concern = $request->concern;
            }


            $dataModel->created_at = $timeStamp;
            $dataModel->updated_at = $timeStamp;

            $qResponce = $dataModel->save();

            if ($qResponce) {
                if (isset($request->coupon_id)) {
                    $dataCouponUseModel = new CouponUseModel;
                    $dataCouponUseModel->user_id = $request->user_id;
                    $dataCouponUseModel->clinic_id = $clinicId;
                    $dataCouponUseModel->appointment_id  =  $dataModel->id;
                    $dataCouponUseModel->coupon_id   = $request->coupon_id;
                    $dataCouponUseModel->created_at = $timeStamp;
                    $dataCouponUseModel->updated_at = $timeStamp;
                    $dataCouponUseModel->save();
                    if (!$dataCouponUseModel) {
                        throw new \Exception('Error');
                    }
                }


                $dataInvoiceModel = new AppointmentInvoiceModel;
                $dataInvoiceModel->patient_id = $patientId;
                $dataInvoiceModel->user_id = $request->user_id;
                $dataInvoiceModel->clinic_id = $clinicId;
                $dataInvoiceModel->appointment_id  = $dataModel->id;
                $dataInvoiceModel->status = $request->payment_status;
                $dataInvoiceModel->total_amount  = $request->total_amount;
                $dataInvoiceModel->invoice_date = $date;
                $dataInvoiceModel->created_at = $timeStamp;
                $dataInvoiceModel->updated_at = $timeStamp;
                $dataInvoiceModel->coupon_title = $request->coupon_title;
                $dataInvoiceModel->coupon_value = $request->coupon_value;
                $dataInvoiceModel->coupon_off_amount = $request->coupon_off_amount;
                $dataInvoiceModel->coupon_id = $request->coupon_id;
                $qResponceInvoice = $dataInvoiceModel->save();

                if ($qResponceInvoice) {

                    $dataInvoiceItemModel = new AppointmentInvoiceItemModel;
                    $dataInvoiceItemModel->invoice_id = $dataInvoiceModel->id;
                    $dataInvoiceItemModel->description  = $request->invoice_description;
                    $dataInvoiceItemModel->quantity = 1;
                    $dataInvoiceItemModel->clinic_id = $clinicId;
                    $dataInvoiceItemModel->unit_price  = $request->fee;
                    $dataInvoiceItemModel->service_charge =  $request->service_charge;
                    $dataInvoiceItemModel->total_price = $request->unit_total_amount;
                    $dataInvoiceItemModel->unit_tax  = $request->tax ?? 0;
                    $dataInvoiceItemModel->unit_tax_amount  = $request->unit_tax_amount ?? 0;

                    $dataInvoiceItemModel->created_at = $timeStamp;
                    $dataInvoiceItemModel->updated_at = $timeStamp;

                    $qResponceInvoiceItem = $dataInvoiceItemModel->save();
                    if ($qResponceInvoiceItem) {
                        if (isset($request->payment_transaction_id)) {
                            $dataPaymentModel = new AppointmentPaymentModel;
                            $dataPaymentModel->txn_id = $dataTXNModel->id;
                            $dataPaymentModel->invoice_id   = $dataInvoiceModel->id;
                            $dataPaymentModel->amount   = $request->total_amount;
                            $dataPaymentModel->payment_time_stamp   = $timeStamp;
                            $dataPaymentModel->clinic_id = $clinicId;
                            $dataPaymentModel->payment_method   = $request->payment_method;
                            $dataPaymentModel->created_at = $timeStamp;
                            $dataPaymentModel->updated_at = $timeStamp;
                            $qResponcePayment = $dataPaymentModel->save();
                        }
                        if (isset($request->payment_transaction_id)) {
                            $dataTXNModel->appointment_id = $dataModel->id;
                            $dataTXNModel->save();
                        }


                        DB::commit();
                        if ($request->type == "Video Consultant") {
                            // Pass dependencies if needed
                            $zoomController = new ZoomVideoCallController();
                            $zoomController->createMeeting($dataModel->id, $dataModel->date, $dataModel->time_slots); // Ensure it doesn't rely on constructor dependencies
                        }

                        $notificationCentralController = new NotificationCentralController();
                        $notificationCentralController->sendAppointmentNotificationToUsers($dataModel->id);

                        return Helpers::successWithIdResponse("successfully", $dataModel->id);
                    } else {
                        throw new \Exception('Error');
                    }
                } else {
                    throw new \Exception('Error');
                }
            } else {
                throw new \Exception('Error');
            }
        } catch (\Exception $e) {
            DB::rollBack();

            return Helpers::errorResponse("error $e");
        }
    }
    // appointment resch
    function appointmentResch(Request $request)
    {

        $validator = Validator::make(request()->all(), [
            'id' => 'required',
            'time_slots' => 'required',
            'date' => 'required',
        ]);
        if ($validator->fails())
            return response(["response" => 400], 400);
        try {
            DB::beginTransaction();


            $dataModel = AppointmentModel::where("id", $request->id)->first();
            if ($dataModel == null) {
                DB::rollBack();
                return Helpers::errorResponse("error");
            }
            $oldTime = $dataModel->time_slots;
            $oldDate = $dataModel->date;
            $currentStatus = $dataModel->status;
            if ($currentStatus == "Rejected" || $currentStatus == "Cancelled") {
                DB::rollBack();
                return Helpers::errorResponse("Cannot update status");
            }
            $dataModel->status = 'Rescheduled';
            $dataModel->time_slots = $request->time_slots;
            $dataModel->date = $request->date;
            $timeStamp = date("Y-m-d H:i:s");
            $dataModel->updated_at = $timeStamp;
            $qResponce = $dataModel->save();
            if (!$qResponce) {
                DB::rollBack();

                return Helpers::errorResponse("error");
            }

            $appointmentData = DB::table("appointments")
                ->select('appointments.*', 'patients.user_id')
                ->join("patients", "patients.patient_code", '=', 'appointments.patient_code')
                ->where("appointments.id", "=", $request->id)
                ->first();
            $userId = $appointmentData->user_id;
            $patient_code = $appointmentData->patient_code;
            if ($patient_code == null) {
                DB::rollBack();
                return Helpers::errorResponse("error");
            }
            $dataASLModel = new AppointmentStatusLogModel;
            $dataASLModel->appointment_id  =  $request->id;
            $dataASLModel->user_id  = $userId;
            $dataASLModel->status  = "Rescheduled";
            $dataASLModel->patient_code  = $patient_code;
            $dataASLModel->clinic_id  =  $dataModel->clinic_id;
            $dataASLModel->notes  = "Appointment " . $oldDate . " " . $oldTime . " rescheduled to " . $request->date . " " . $request->time_slots;
            $dataASLModel->created_at = $timeStamp;
            $dataASLModel->updated_at = $timeStamp;
            $qResponceApp = $dataASLModel->save();
            if (!$qResponceApp) {
                DB::rollBack();
                return Helpers::errorResponse("error");
            }
            DB::commit();
            if ($dataModel->type == "Video Consultant") {
                // Pass dependencies if needed
                $zoomController = new ZoomVideoCallController();
                $zoomController->updateMeeting($dataModel->id, $dataModel->meeting_id, $request->date, $request->time_slots); // Ensure it doesn't rely on constructor dependencies
            }
            $notificationCentralController = new NotificationCentralController();
            $notificationCentralController->sendWalletRshNotificationToUsersAgainstRejected($request->id, $oldDate, $oldTime);

            return Helpers::successResponse("successfully");
        } catch (\Exception $e) {
            DB::rollBack();
            return Helpers::errorResponse("error $e");
        }
    }

    // Update data
    function updateStatus(Request $request)
    {


        $validator = Validator::make(request()->all(), [
            'id' => 'required',
            "status" => 'required'
        ]);
        if ($validator->fails())
            return response(["response" => 400], 400);
        try {
            DB::beginTransaction();
            if ($request->status == "Cancelled") {
                DB::rollBack();
                return Helpers::errorResponse("Cannot update status");
            }

            $dataModel = AppointmentModel::where("id", $request->id)->first();
            $currentStatus = $dataModel->status;
            if ($currentStatus == "Rejected" || $currentStatus == "Cancelled") {
                DB::rollBack();
                return Helpers::errorResponse("Cannot update status");
            }
            $dataModel->status = $request->status;
            $timeStamp = date("Y-m-d H:i:s");
            $dataModel->updated_at = $timeStamp;
            $qResponce = $dataModel->save();
            if ($qResponce) {

                $appointmentData = DB::table("appointments")
                    ->select('appointments.*', 'patients.user_id')
                    ->join("patients", "patients.patient_code", '=', 'appointments.patient_code')
                    ->where("appointments.id", "=", $request->id)
                    ->first();
                $userId = $appointmentData->user_id;
                $patient_code = $appointmentData->patient_code;
                if ($patient_code == null) {
                    DB::rollBack();
                    return Helpers::errorResponse("error");
                }
                $dataASLModel = new AppointmentStatusLogModel;
                $dataASLModel->appointment_id  =  $request->id;
                $dataASLModel->user_id  = $userId;
                $dataASLModel->status  =  $request->status;
                $dataASLModel->clinic_id = $dataModel->clinic_id;
                $dataASLModel->patient_code  = $patient_code;
                $dataASLModel->created_at = $timeStamp;
                $dataASLModel->updated_at = $timeStamp;
                $qResponceApp = $dataASLModel->save();
                if (!$qResponceApp) {
                    DB::rollBack();
                    return Helpers::errorResponse("error");
                }
                DB::commit();
                if ($request->status == "Rejected") {
                    if ($appointmentData->type == "Video Consultant") {
                        // Pass dependencies if needed
                        $zoomController = new ZoomVideoCallController();
                        $zoomController->deleteMeeting($appointmentData->id, $appointmentData->meeting_id); // Ensure it doesn't rely on constructor dependencies
                    }
                }
                $notificationCentralController = new NotificationCentralController();
                $notificationCentralController->sendAppointmentSatusChangeNotificationToUsers($request->id, $request->status);
                return Helpers::successResponse("successfully");
            } else {
                DB::rollBack();

                return Helpers::errorResponse("error");
            }
        } catch (\Exception $e) {
            DB::rollBack();
            return Helpers::errorResponse("error");
        }
    }


    //Delete Data
    function deleteData(Request $request)
    {

        $validator = Validator::make(request()->all(), [
            'id' => 'required'
        ]);
        if ($validator->fails())
            return response(["response" => 400], 400);
        try {

            $dataModel = CityModel::where("id", $request->id)->first();

            $qResponce = $dataModel->delete();
            if ($qResponce) {

                return Helpers::successResponse("successfully");
            } else {

                return Helpers::errorResponse("error");
            }
        } catch (\Exception $e) {
            return Helpers::errorResponse("error");
        }
    }

    // get data

    function getBookedTimeSlotsByDoctIdAndDateAndTpe(Request $request)
    {
        $validator = Validator::make(request()->all(), [
            'date' => 'required',
            'doct_id' => 'required',
            'type' => 'required'


        ]);
        if ($validator->fails())
            return response(["response" => 400], 400);

        $data = DB::table("appointments")
            ->select(
                DB::raw("TO_CHAR(appointments.time_slots, 'HH24:MI') as time_slots"),
                'appointments.date',
                'appointments.type',
                'appointments.id as appointment_id'
            )
            ->where("appointments.status", "!=", 'Rejected')
            ->where("appointments.status", "!=", 'Completed')
            ->where("appointments.status", "!=", 'Cancelled')
            ->where("appointments.date", "=", $request->date)
            ->where("appointments.type", "=", $request->type)
            ->where("appointments.doct_id", "=", $request->doct_id)
            ->get();

        $response = [
            "response" => 200,
            'data' => $data,
        ];

        return response($response, 200);
    }

    // get data by id

    function getDataById($id)
    {
        $data = DB::table("appointments")
            ->select(
                'appointments.*',
                'patients.user_id',
                'patients.f_name as patient_f_name',
                'patients.l_name as patient_l_name',
                'patients.l_name as patient_l_name',
                'patients.phone as patient_phone',
                'patients.gender as patient_gender',
                'patients.dob as patient_dob',
                'department.title as dept_title',
                'users.f_name as doct_f_name',
                'users.l_name as doct_l_name',
                "users.image as doct_image",
                "doctors.specialization as doct_specialization",
                'clinics.title as clinic_title',
                "clinics.address as clinics_address",
                'clinics.image as clinic_thumb_image',
                'clinics.phone as clinic_phone',
                'clinics.phone_second as clinic_phone_second',
                'clinics.whatsapp as clinic_whatsapp',
                'clinics.email as clinic_email',
                'clinics.latitude as clinic_latitude',
                'clinics.longitude as clinic_longitude',
                'clinics.ambulance_number as clinic_ambulance_number',
                'clinics.ambulance_btn_enable as clinic_ambulance_btn_enable',

            )
            ->Join('patients', 'patients.patient_code', '=', 'appointments.patient_code')
            ->Join('department', 'department.id', '=', 'appointments.dept_id')
            ->Join('users', 'users.id', '=', 'appointments.doct_id')
            ->join('clinics', 'clinics.id', '=', 'appointments.clinic_id')
            ->LeftJoin('doctors', 'doctors.user_id', '=', 'appointments.doct_id')
            ->where('appointments.id', '=', $id)
            ->first();

        if ($data != null) {

            $dataDR = DB::table("doctors_review")
                ->select('doctors_review.*')
                ->where("doctors_review.doctor_id", "=", $data->doct_id)
                ->get();
            // Calculate the total review points
            $totalReviewPoints = $dataDR->sum('points'); // Assuming 'review_points' is the column name for review points

            // Count the number of reviews
            $numberOfReviews = $dataDR->count();
            // Calculate the average rating
            $averageRating = $numberOfReviews > 0 ? number_format($totalReviewPoints / $numberOfReviews, 2) : '0.00';

            $data->total_review_points = $totalReviewPoints;
            $data->number_of_reviews = $numberOfReviews;
            $data->average_rating = $averageRating;

            $dataDApp = DB::table("appointments")
                ->select('appointments.*')
                ->where("appointments.doct_id", "=", $data->doct_id)
                ->get();
            // Calculate the total review points
            $data->total_appointment_done = count($dataDApp);
        }
        $response = [
            "response" => 200,
            'data' => $data,
        ];

        return response($response, 200);
    }





    public function getData(Request $request)
    {
        // Define the base query
        $query = DB::table("appointments")
            ->select(
                'appointments.*',
                'patients.user_id',
                'patients.f_name as patient_f_name',
                'patients.l_name as patient_l_name',
                'patients.phone as patient_phone',
                'department.title as dept_title',
                'users.f_name as doct_f_name',
                'users.l_name as doct_l_name',
                'users.image as doct_image',
                'doctors.specialization as doct_specialization'
            )
            ->join('patients', 'patients.patient_code', '=', 'appointments.patient_code')
            ->join('department', 'department.id', '=', 'appointments.dept_id')
            ->join('users', 'users.id', '=', 'appointments.doct_id')
            ->leftJoin('doctors', 'doctors.user_id', '=', 'appointments.doct_id')
            ->orderBy("appointments.date", "DESC")
            ->orderBy("appointments.time_slots", "DESC");

        // Apply filters efficiently
        if ($request->filled('start_date')) {
            $query->whereDate('appointments.date', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('appointments.date', '<=', $request->end_date);
        }

        if ($request->filled('status')) {
            $status = explode(',', $request->status);
            $query->whereIn('appointments.status', $status);
        }

        if ($request->filled('user_id')) {
            $query->where('patients.user_id', '=', $request->user_id);
        }

        if ($request->filled('doctor_id')) {
            $query->where('appointments.doct_id', '=', $request->doctor_id);
        }

        if ($request->filled('clinic_id')) {
            $query->where('appointments.clinic_id', '=', $request->clinic_id);
        }

        if ($request->filled('patient_id')) {
            $query->where('appointments.patient_code', '=', $request->patient_id );
        }

        if ($request->filled('dept_id')) {
            $query->where('appointments.dept_id', '=', $request->dept_id );
        }


        if ($request->filled('type')) {
            $query->where('appointments.type', '=', $request->type );
        }


        if ($request->filled('current_cancel_req_status')) {
            $query->where('appointments.current_cancel_req_status', '=', $request->current_cancel_req_status );
        }



        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('patients.user_id', 'like', "%$search%")
                    ->orWhereRaw("CONCAT(patients.f_name, ' ' , patients.l_name) LIKE ?", ["%$search%"])
                    ->orWhereRaw("CONCAT(users.f_name, ' ' , users.l_name) LIKE ?", ["%$search%"])
                    ->orWhere('patients.phone', 'like', "%$search%")
                    ->orWhere('department.title', 'like', "%$search%")
                    ->orWhere('appointments.id', 'like', "%$search%")
                    ->orWhere('appointments.status', 'like', "%$search%")
                    ->orWhere('appointments.time_slots', 'like', "%$search%")
                    ->orWhere('appointments.date', 'like', "%$search%")
                    ->orWhere('appointments.type', 'like', "%$search%")
                    ->orWhere('appointments.meeting_id', 'like', "%$search%")
                    ->orWhere('appointments.payment_status', 'like', "%$search%")
                    ->orWhere('appointments.current_cancel_req_status', 'like', "%$search%")
                    ->orWhere('doctors.specialization', 'like', "%$search%");
            });
        }
        $total_record = $query->count();
        // Handle start & end for pagination
        if ($request->filled(['start', 'end'])) {
            $start = $request->start;
            $limit = $request->end - $start;
            $query->skip($start)->take($limit);
        }


        $data = $query->get();

        return response()->json([
            "response" => 200,
            "total_record" => $total_record,
            "data" => $data,
        ], 200);
    }



}
