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
use App\Models\PatientModel;
use Illuminate\Support\Facades\Validator;
use App\CentralLogics\Helpers;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;
use App\Http\Controllers\Api\V1\NotificationCentralController;

class AllTransactionController extends Controller
{

  private function getWalletForPatientCode(string $patientCode)
  {
    $query = DB::table('wallets');

    if (Schema::hasColumn('wallets', 'patient_code')) {
      $query->where('patient_code', $patientCode);
    } else {
      $query->where('owner_id', $patientCode);
      if (Schema::hasColumn('wallets', 'owner_type')) {
        $query->where('owner_type', 'patient');
      }
    }

    return $query->orderByDesc('id')->first();
  }

  private function upsertWalletBalance(string $patientCode, float $newAmount, string $timeStamp)
  {
    $wallet = $this->getWalletForPatientCode($patientCode);

    if ($wallet) {
      return DB::table('wallets')
        ->where('id', $wallet->id)
        ->update(['balance' => $newAmount, 'updated_at' => $timeStamp]);
    }

    $insert = [
      'balance'    => $newAmount,
      'currency'   => 'PHP',
      'created_at' => $timeStamp,
      'updated_at' => $timeStamp,
    ];

    if (Schema::hasColumn('wallets', 'patient_code')) {
      $insert['patient_code'] = $patientCode;
    } else {
      $insert['owner_id'] = $patientCode;
      if (Schema::hasColumn('wallets', 'owner_type')) {
        $insert['owner_type'] = 'patient';
      }
    }

    return DB::table('wallets')->insert($insert);
  }

  function updateWalletMoneyData(Request $request)
  {

    $validator = Validator::make(request()->all(), [
      'user_id' => 'required',
      'amount' => 'required',
      'payment_transaction_id' => 'required',
      'payment_method' => 'required',
      'transaction_type' => 'required',
      'description' => 'required'

    ]);
    // dd($request->all());
    if ($validator->fails())
      //return response (["response"=>400],400);
      return response()->json($validator->errors(), 400);
    else {
      try {
        DB::beginTransaction();
        $date = date("Y-m-d");

        $timeStamp = date("Y-m-d H:i:s");
        $dataModel = new AllTransactionModel;
        $dataModel->user_id  = $request->user_id;
        $dataModel->payment_transaction_id  = $request->payment_transaction_id;
        $dataModel->is_Wallet_txn = 1;
        $dataModel->amount = $request->amount;

        $dataModel->transaction_type  =  $request->transaction_type;

        $dataModel->created_at = $timeStamp;
        $dataModel->updated_at = $timeStamp;

        $qResponce = $dataModel->save();
        if (!$qResponce) {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }

        $dataInvoiceModel = new AppointmentInvoiceModel;
        $dataInvoiceModel->user_id = $request->user_id;
        $dataInvoiceModel->status = "Paid";
        $dataInvoiceModel->total_amount  = $request->amount;
        $dataInvoiceModel->invoice_date = $date;
        $dataInvoiceModel->created_at = $timeStamp;
        $dataInvoiceModel->updated_at = $timeStamp;

        $qResponceInvoice = $dataInvoiceModel->save();
        if (!$qResponceInvoice) {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }


        $dataInvoiceItemModel = new AppointmentInvoiceItemModel;
        $dataInvoiceItemModel->invoice_id = $dataInvoiceModel->id;
        $dataInvoiceItemModel->description  = $request->description;
        $dataInvoiceItemModel->quantity = 1;
        $dataInvoiceItemModel->unit_price  = $request->amount;
        $dataInvoiceItemModel->service_charge =  0;
        $dataInvoiceItemModel->total_price = $request->amount;

        $dataInvoiceItemModel->created_at = $timeStamp;
        $dataInvoiceItemModel->updated_at = $timeStamp;

        $qResponceInvoiceItem = $dataInvoiceItemModel->save();

        if (!$qResponceInvoiceItem) {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }

        $dataPaymentModel = new AppointmentPaymentModel;
        $dataPaymentModel->txn_id = $dataModel->id;
        $dataPaymentModel->invoice_id   = $dataInvoiceModel->id;
        $dataPaymentModel->amount   = $request->amount;
        $dataPaymentModel->payment_time_stamp   = $timeStamp;
        $dataPaymentModel->payment_method   = $request->payment_method;
        $dataPaymentModel->created_at = $timeStamp;
        $dataPaymentModel->updated_at = $timeStamp;
        $qResponcePayment = $dataPaymentModel->save();
        if (!$qResponcePayment) {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }

        // Wallet is keyed by patient_code (VARCHAR 15); user_id here is patients.id
        $patientRecord = PatientModel::where('id', $request->user_id)->first();
        if (!$patientRecord || !$patientRecord->patient_code) {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }
        $dataModel->patient_code = $patientRecord->patient_code;
        $walletRecord = $this->getWalletForPatientCode($patientRecord->patient_code);
        $oldAmount = $walletRecord ? (float) $walletRecord->balance : 0.0;
        $newAmount = $request->transaction_type == "Credited"
            ? $oldAmount + (float) $request->amount
            : $oldAmount - (float) $request->amount;
        $walletUpdateRes = $this->upsertWalletBalance($patientRecord->patient_code, (float) $newAmount, $timeStamp);
        if (!$walletUpdateRes) {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }


        $dataModel->last_wallet_amount = $oldAmount;
        $dataModel->new_wallet_amount = $newAmount;
        $qResponceTrUpdate = $dataModel->save();
        if (!$qResponceTrUpdate) {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }
        DB::commit();

        $notificationCentralController = new NotificationCentralController();
        $notificationCentralController->sendWalletNotificationToUsers($request->user_id, $request->transaction_type, $request->amount, $dataModel->id);

        return Helpers::successWithIdResponse("successfully", $dataModel->id);
      } catch (\Exception $e) {

        return Helpers::errorResponse("error $e");
      }
    }
  }

  function updateWalletMoneyDataWithoutAppointmentData(Request $request)
  {

    $validator = Validator::make($request->all(), [
      'user_id' => 'required',
      'amount' => 'required',
      'payment_transaction_id' => 'required',
      'payment_method' => 'required',
      'transaction_type' => 'required',
      'description' => 'required'

    ]);

    if ($validator->fails()){
      return response()->json($validator->errors(), 400);
    }
    else {
      try {
        DB::beginTransaction();
       // $date = date("Y-m-d");

        $timeStamp = date("Y-m-d H:i:s");
        $dataModel = new AllTransactionModel;
        $dataModel->user_id  = $request->user_id;
        $dataModel->payment_transaction_id  = $request->payment_transaction_id;
        $dataModel->is_Wallet_txn = 1;
        $dataModel->amount = $request->amount;

        $dataModel->transaction_type  =  $request->transaction_type;

        $dataModel->created_at = $timeStamp;
        $dataModel->updated_at = $timeStamp;

        $qResponce = $dataModel->save();
        if (!$qResponce) {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }

        // Wallet is keyed by patient_code (VARCHAR 15); user_id here is patients.id
        $patientRecord2 = PatientModel::where('id', $request->user_id)->first();
        if (!$patientRecord2 || !$patientRecord2->patient_code) {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }
        $dataModel->patient_code = $patientRecord2->patient_code;
        $walletRecord2 = $this->getWalletForPatientCode($patientRecord2->patient_code);
        $oldAmount = $walletRecord2 ? (float) $walletRecord2->balance : 0.0;
        $newAmount = $request->transaction_type == "Credited"
            ? $oldAmount + (float) $request->amount
            : $oldAmount - (float) $request->amount;
        $walletUpdateRes = $this->upsertWalletBalance($patientRecord2->patient_code, (float) $newAmount, $timeStamp);

        if (!$walletUpdateRes) {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }


        $dataModel->last_wallet_amount = $oldAmount;
        $dataModel->new_wallet_amount = $newAmount;
        $qResponceTrUpdate = $dataModel->save();
        if (!$qResponceTrUpdate) {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }
        DB::commit();

        // $notificationCentralController = new NotificationCentralController();
        // $notificationCentralController->sendWalletNotificationToUsers($request->user_id, $request->transaction_type, $request->amount, $dataModel->id);

        return Helpers::successWithIdResponse("successfully", $dataModel->id);
      } catch (\Exception $e) {
        return Helpers::errorResponse("error $e");
      }
    }
  }

  function balanceTransfer(Request $request)
  {

    $validator = Validator::make(request()->all(), [
      'from_user_id' => 'nullable',
      'from_patient_code' => 'nullable|string',
      'patient_code' => 'nullable|string',
      'to_phone' => 'required',
      'amount' => 'required',
      'description' => 'required'
    ]);
    if ($validator->fails())
      return response()->json($validator->errors(), 400);
    else {
      try {

        $amount = (float) $request->amount;
        if ($amount <= 0) {
            return Helpers::errorResponse("Balance Transfer Amount should not be equal to 0");
        }

        $senderPatientCode = trim((string) ($request->from_patient_code ?? $request->patient_code ?? ''));
        $senderPatient = null;

        if ($senderPatientCode !== '') {
          $senderPatient = PatientModel::where('patient_code', $senderPatientCode)->first();
        }

        if (!$senderPatient && !empty($request->from_user_id)) {
          $senderPatient = PatientModel::where('id', $request->from_user_id)->first();
        }

        if (!$senderPatient || !$senderPatient->patient_code) {
          return Helpers::errorResponse("Sender wallet not found");
        }

        $normalizedPhone = preg_replace('/\D+/', '', (string) $request->to_phone);
        $recipientPatient = PatientModel::where('phone', $normalizedPhone)->first();
        if (!$recipientPatient || !$recipientPatient->patient_code) {
          return Helpers::errorResponse("User Not Found");
        }

        if ($recipientPatient->patient_code === $senderPatient->patient_code) {
          return Helpers::errorResponse("Balance Transfer Not Possible In Your Own Account");
        }

        $senderWallet = $this->getWalletForPatientCode($senderPatient->patient_code);
        $senderBalance = $senderWallet ? (float) $senderWallet->balance : 0.0;

        if ($senderBalance >= $amount) {
            $transferReference = trim((string) ($request->transaction_reference ?? $request->payment_transaction_id ?? ''));
            if ($transferReference === '') {
              $transferReference = 'BT-' . time();
            }

            // Idempotency guard: if sender debit with this reference already exists,
            // treat the call as successful replay and avoid duplicate mutations.
            $existingDebit = DB::table('all_transaction')
              ->where('payment_transaction_id', $transferReference)
              ->where('patient_code', $senderPatient->patient_code)
              ->where('transaction_type', 'Debited')
              ->where('is_Wallet_txn', 1)
              ->exists();

            if ($existingDebit) {
              return Helpers::successResponse("Balance transferred successfully");
            }

            DB::beginTransaction();

            // Deduct from sender
            $deductRequest = new Request([
            'user_id' => $senderPatient->id,
            'amount' => $amount,
            'payment_transaction_id' => $transferReference,
            'payment_method' => 'Balance Transfer',
            'transaction_type' => 'Debited',
            'description' => $request->description,
            ]);

            $deductResponse = $this->updateWalletMoneyDataWithoutAppointmentData($deductRequest);
            $deductPayload = method_exists($deductResponse, 'getData')
              ? $deductResponse->getData(true)
              : null;
            if (is_array($deductPayload) && isset($deductPayload['response']) && (int) $deductPayload['response'] !== 200) {
              DB::rollBack();
              return Helpers::errorResponse($deductPayload['message'] ?? 'Unable to debit sender wallet');
            }

            // Add to receiver
            $addRequest = new Request([
            'user_id' => $recipientPatient->id,
            'amount' => $amount,
            'payment_transaction_id' => $transferReference,
            'payment_method' => 'Balance Transfer',
            'transaction_type' => 'Credited',
            'description' => $request->description,
            ]);
            $creditResponse = $this->updateWalletMoneyDataWithoutAppointmentData($addRequest);
            $creditPayload = method_exists($creditResponse, 'getData')
              ? $creditResponse->getData(true)
              : null;
            if (is_array($creditPayload) && isset($creditPayload['response']) && (int) $creditPayload['response'] !== 200) {
              DB::rollBack();
              return Helpers::errorResponse($creditPayload['message'] ?? 'Unable to credit recipient wallet');
            }

            DB::commit();


            return Helpers::successResponse("Balance transferred successfully");
        }
        else{

            return Helpers::errorResponse("Insufficient Balance.");
        }


      } catch (\Exception $e) {

        return Helpers::errorResponse("error $e");
      }
    }
  }




  function getDataById($id)
  {
    $data = DB::table("all_transaction")
      ->select(
        'all_transaction.*',
        'patients.f_name as patient_f_name',
        'patients.l_name as patient_l_name',
        'users.f_name as user_f_name',
        'users.l_name as user_l_name'
      )
      ->LeftJoin('patients', 'patients.patient_code', '=', 'all_transaction.patient_code')
      ->LeftJoin('users', 'users.id', '=', 'all_transaction.user_id')
      ->Where('all_transaction.id', '=', $id)
      ->OrderBy('all_transaction.created_at', 'DESC')
      ->first();

    $response = [
      "response" => 200,
      'data' => $data,
    ];

    return response($response, 200);
  }




  public function getData(Request $request)
  {
    // Define the base query
    $query = DB::table("all_transaction")
      ->select(
        'all_transaction.*',
        'patients.f_name as patient_f_name',
        'patients.l_name as patient_l_name',
        'users.f_name as user_f_name',
        'users.l_name as user_l_name',
        'appointments.doct_id'
      )
      ->leftJoin('patients', 'patients.patient_code', '=', 'all_transaction.patient_code')
      ->leftJoin('users', 'users.id', '=', 'all_transaction.user_id')
      ->leftJoin('appointments', 'appointments.id', '=', 'all_transaction.appointment_id')
      ->orderBy('all_transaction.created_at', 'DESC');

    // Apply filters efficiently
    if ($request->filled('appointment_id')) {
      $query->Where('all_transaction.appointment_id', '=', $request->appointment_id);
    }
    // Apply filters efficiently
    if ($request->filled('doctor_id')) {
      $query->where('appointments.doct_id', $request->doctor_id);
    }

    if ($request->filled('user_id')) {
      $query->where("all_transaction.user_id", "=", $request->user_id);
    }

    if ($request->filled('patient_code')) {
      $query->where("all_transaction.patient_code", "=", $request->patient_code);
    }


    if ($request->filled('is_wallet_txn')) {
      $query->where("all_transaction.is_wallet_txn", "=", $request->is_wallet_txn);
    }
    if ($request->filled('clinic_id')) {
      $query->where("all_transaction.clinic_id", "=", $request->clinic_id);
    }


    if ($request->filled('start_date')) {
      $query->whereDate('all_transaction.created_at', '>=', $request->start_date);
    }

    if ($request->filled('end_date')) {
      $query->whereDate('all_transaction.created_at', '<=', $request->end_date);
    }

    // Apply search filter
    if ($request->filled('search')) {
      $search = $request->input('search');
      $query->where(function ($q) use ($search) {
        $q->whereRaw("CONCAT(patients.f_name, ' ' , patients.l_name) LIKE ?", ["%$search%"])
          ->orWhereRaw("CONCAT(users.f_name, ' ' , users.l_name) LIKE ?", ["%$search%"])
          ->orWhere('all_transaction.id', 'like', "%$search%")
          ->orWhere('all_transaction.user_id', 'like', "%$search%")
          ->orWhere('all_transaction.patient_code', 'like', "%$search%")
          ->orWhere('all_transaction.appointment_id', 'like', "%$search%")
          ->orWhere('all_transaction.payment_transaction_id', 'like', "%$search%")
          ->orWhere('all_transaction.amount', 'like', "%$search%")
          ->orWhere('all_transaction.transaction_type', 'like', "%$search%")
          ->orWhere('all_transaction.notes', 'like', "%$search%");
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
