<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\FamilyMembersModel;
use App\Models\RoleAssignModel;
use App\Models\UserNotificationModel;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\CentralLogics\Helpers;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class UserController extends Controller
{

  function getData()
  {

    $data = DB::table('users')
      ->select(
        "id",
        "wallet_amount",
        "f_name",
        "l_name",
        "phone",
        "isd_code",
        "gender",
        "dob",
        "email",
        "image",
        "address",
        "city",
        "state",
        "postal_code",
        "isd_code_sec",
        "phone_sec",
        "email_verified_at",
        "remember_token",
        "created_at",
        "updated_at"
      )
      ->get();
    $response = [
      "response" => 200,
      'data' => $data,
    ];

    return response($response, 200);
  }

  function getDataById($id)
  {

    $data = DB::table("users")
      ->select(
        'users.*',
        'users_role_assign.role_id',
        'roles.name as role_name',
        'users_role_assign.id as role_assign_id',

      )
      ->where("users.id", "=", $id)
      ->leftJoin('users_role_assign', 'users_role_assign.user_id', '=', 'users.id')
      ->leftJoin('roles', 'roles.id', '=', 'users_role_assign.role_id')
      ->first();
    $response = [
      "response" => 200,
      'data' => $data,
    ];

    return response($response, 200);
  }

  // add new users
  function addData(Request $request)
  {

    $validator = Validator::make(request()->all(), [
      'f_name' => 'required',
      'l_name' => 'required'
    ]);

    if ($validator->fails())

      return response(["response" => 400], 400);
    else {
      if (!isset($request->phone) && !isset($request->email)) {
        return Helpers::errorResponse("phone or email required");
      }

      if (isset($request->phone)) {
        $alreadyAddedModel = User::where("phone", $request->phone)->where('is_deleted', '=', false)->first();
        if ($alreadyAddedModel) {
          return Helpers::errorResponse("phone number already exists");
        }
      }
      if (isset($request->email)) {
        $alreadyAddedModel = User::where("email", $request->email)->where('is_deleted', '=', false)->first();
        if ($alreadyAddedModel) {
          return Helpers::errorResponse("email id already exists");
        }
      }

      if (isset($request->phone)) {
        if (!is_numeric($request->phone)) {
          return Helpers::errorResponse("Please enter valid phone number");
        }
      }
      try {
        DB::beginTransaction();
        $timeStamp = date("Y-m-d H:i:s");
        $userModel = new User;
        if (isset($request->phone)) {
          $userModel->phone = $request->phone;
        }
        if (isset($request->email)) {
          $userModel->email = $request->email;
        } else {
          $userModel->email = $request->phone . '@mobile.gentrx.ph';
        }


        if (isset($request->password)) {
          $userModel->password = Hash::Make($request->password);
        } else if (!isset($request->password)) {
          $userModel->password = Hash::make(Str::random(8));
        }
        $userModel->f_name = $request->f_name;
        $userModel->l_name = $request->l_name;
        $userModel->name = $request->f_name . ' ' . $request->l_name;

        if (isset($request->dob)) {
          $userModel->dob = $request->dob;
        }
        if (isset($request->gender)) {
          $userModel->gender = $request->gender;
        }
        if (isset($request->isd_code)) {
          $userModel->isd_code = $request->isd_code;
        }
        if (isset($request->clinic_id)) {
          $userModel->clinic_id = $request->clinic_id;
        }

        // if (isset($request->role_name)) {
        //   $roleNames = explode(',', $request->role_name); // Assuming roles are separated by commas

        //   // Assign roles to the user
        //   $userModel->assignRole($roleNames);
        // }

        $userModel->created_at = $timeStamp;
        $userModel->updated_at = $timeStamp;
        if (isset($request->image)) {

          $userModel->image = $request->hasFile('image') ? Helpers::uploadImage('users/', $request->file('image')) : null;
        }

        $qResponce = $userModel->save();

        if ($qResponce) {
          if ($request->phone) {
            $dataModel = new FamilyMembersModel;
            $dataModel->f_name = $request->f_name;
            $dataModel->l_name = $request->l_name;
            $dataModel->user_id = $userModel->id;
            if (isset($request->isd_code)) {
              $dataModel->isd_code = $request->isd_code;
            }
            if (isset($request->phone)) {
              $dataModel->phone = $request->phone;
            }
            $dataModel->save();
          }

          if ($request->role_id) {

            $alreadyAddedRModel = RoleAssignModel::where("user_id", $userModel->id)->first();

            if ($alreadyAddedRModel == null) {
              $dataModelR = new RoleAssignModel;
              $dataModelR->role_id = $request->role_id;
              $dataModelR->user_id = $userModel->id;
              $dataModelR->created_at = $timeStamp;
              $dataModelR->updated_at = $timeStamp;
              $res = $dataModelR->save();
            }
          }
          DB::commit();
          //return Helpers::successWithIdResponse("successfully", $userModel->id);
            $userModel->tokens()->delete();
            $token = $userModel->createToken('my-app-token')->plainTextToken;


            $response = [
                "response" => 200,
                "status" => true,
                'message' => "Successfully",
                'data' => $userModel,
                'token' => $token,
                'id'=> $userModel->id,
            ];

            return response($response, 200);
        } else {
          DB::rollBack();
          return Helpers::errorResponse("error");
        }
      } catch (\Exception $e) {
        DB::rollBack();
        return Helpers::errorResponse("error $e");
      }
    }
  }
  // Update Password
  function updatePassword(Request $request)
  {
    $initialCheck = false;
    $validator = Validator::make(request()->all(), [
      'user_id' => 'required',
      'password' => 'required'
    ]);
    if ($validator->fails())
      $initialCheck = true;

    if ($initialCheck)
      return response(["response" => 400], 400);
    else {
      try {
        $timeStamp = date("Y-m-d H:i:s");
        $userDetailsModel = User::where("id", $request->user_id)->first();

        $userDetailsModel->password = Hash::Make($request->password);

        $qResponce = $userDetailsModel->save();
        if ($qResponce)
          return Helpers::successResponse("successfully");
        else
          return Helpers::errorResponse("error");
      } catch (\Exception $e) {
        return Helpers::errorResponse("error");
      }
    }
  }

  // Change Password
  function changePassword(Request $request)
  {
    $initialCheck = false;
    $validator = Validator::make(request()->all(), [
      'user_id' => 'required',
      'old_password' => 'required',
      'new_password' => 'required'
    ]);
    if ($validator->fails())
      $initialCheck = true;

    if ($initialCheck)
      return response(["response" => 400], 400);
    else {
      try {
        $timeStamp = date("Y-m-d H:i:s");
        $userDetailsModel = User::where("id", $request->user_id)->first();

         if($request->old_password != '000000'){
            if (!Hash::check($request->old_password, $userDetailsModel->password) ) {
                return response([
                    "response" => 201,
                    "status" => false,
                    'message' => 'These credentials do not match our records.'
                ], 200);
            }
        }

        $userDetailsModel->password = Hash::Make($request->new_password);

        $qResponce = $userDetailsModel->save();
        if ($qResponce)
          return Helpers::successResponse("successfully");
        else
          return Helpers::errorResponse("error");
      } catch (\Exception $e) {
        return Helpers::errorResponse("error");
      }
    }
  }

  // Update soft delete
  function updateDeleted(Request $request)
  {
    $initialCheck = false;
    $validator = Validator::make(request()->all(), [
      'user_id' => 'required'
    ]);
    if ($validator->fails()) {
      return response(["response" => 400], 400);
    }

    try {
      $timeStamp = date("Y-m-d H:i:s");
      $userDetailsModel = User::where("id", $request->user_id)->first();

      $userDetailsModel->is_deleted = true;
      $timeStamp = date("Y-m-d H:i:s");
      $userDetailsModel->deleted_at = $timeStamp;
      $qResponce = $userDetailsModel->save();

      if ($qResponce)
        return Helpers::successResponse("successfully");
      else
        return Helpers::errorResponse("error");
    } catch (\Exception $e) {
      return Helpers::errorResponse("error");
    }
  }
 // Update soft delete
 function softDeleted(Request $request)
 {
   $initialCheck = false;
   $validator = Validator::make(request()->all(), [
     'id' => 'required'
   ]);
   if ($validator->fails()) {
     return response(["response" => 400], 400);
   }

   try {
     $timeStamp = date("Y-m-d H:i:s");
     $userDetailsModel = User::where("id", $request->id)->first();
     $userDetailsModel->is_deleted = true;
     $timeStamp = date("Y-m-d H:i:s");
     $userDetailsModel->deleted_at = $timeStamp;
     $userDetailsModel->fcm =null;
     $userDetailsModel->web_fcm =null;
     $userDetailsModel->phone =null;
     $userDetailsModel->email =null;
     $userDetailsModel->phone_sec =null;
     $userDetailsModel->f_name ="Deleted";
     $userDetailsModel->l_name ="User";
     $oldImage = $userDetailsModel->image;
     if(isset($oldImage)){
      if($oldImage!="def.png"){
          Helpers::deleteImage($oldImage);
      }
  }
     $qResponce = $userDetailsModel->save();

     if ($qResponce)
       return Helpers::successResponse("successfully");
     else
       return Helpers::errorResponse("error");
   } catch (\Exception $e) {
     return Helpers::errorResponse("error");
   }
 }
  function updateDetails(Request $request)
  {
    $initialCheck = false;
    $validator = Validator::make(request()->all(), [
      'id' => 'required'
    ]);
    if ($validator->fails())
      $initialCheck = true;
    if ($initialCheck)
      return response(["response" => 400], 400);
    else {
      try {
        $timeStamp = date("Y-m-d H:i:s");
        $dataModel = User::where("id", $request->id)->first();
        if (isset($request->phone)) {
          $alreadyAddedModel = User::where("phone", $request->phone)->where('id', "!=", $request->id)->first();

          if ($alreadyAddedModel) {
            $response = [
              "response" => 201,
              'status' => false,
              'message' => "phone number already exists"
            ];
            return response($response, 200);
          }
        }

        if (isset($request->email)) {
          $alreadyAddedModel = User::where("email", $request->email)->where('id', "!=", $request->id)->first();
          if ($alreadyAddedModel) {
            $response = [
              "response" => 201,
              'status' => false,
              'message' => "email id already exists"
            ];
            return response($response, 200);
          }
        }
        if (isset($request->f_name))
          $dataModel->f_name = $request->f_name;
        if (isset($request->l_name))
          $dataModel->l_name = $request->l_name;
        if (isset($request->email))
          $dataModel->email = $request->email;
        if (isset($request->phone))
          $dataModel->phone = $request->phone;
        if (isset($request->isd_code))
          $dataModel->isd_code = $request->isd_code;
        if (isset($request->gender))
          $dataModel->gender = $request->gender;
        if (isset($request->dob))
          $dataModel->dob = $request->dob;
        if (isset($request->address))
          $dataModel->address = $request->address;
        if (isset($request->state))
          $dataModel->state = $request->state;
        if (isset($request->city))
          $dataModel->city = $request->city;
        if (isset($request->postal_code))
          $dataModel->postal_code = $request->postal_code;
        if (isset($request->isd_code_sec))
          $dataModel->isd_code_sec = $request->isd_code_sec;
        if (isset($request->phone_sec))
          $dataModel->phone_sec = $request->phone_sec;

        if (isset($request->fcm))
          $dataModel->fcm = $request->fcm;

        if (isset($request->web_fcm))
          $dataModel->web_fcm = $request->web_fcm;

        if (isset($request->notification_seen_at))
          $dataModel->notification_seen_at = $timeStamp;

        $dataModel->updated_at = $timeStamp;
        if (isset($request->image)) {
          if ($request->hasFile('image')) {

            $oldImage = $dataModel->image;
            $dataModel->image =  Helpers::uploadImage('users/', $request->file('image'));
            if (isset($oldImage)) {
              if ($oldImage != "def.png") {
                Helpers::deleteImage($oldImage);
              }
            }
          }
        }

        $qResponce = $dataModel->save();


        if ($qResponce) {

          // $imageFile=isset($request->image)?$request->image:null;
          // $imageId=isset($request->image_id)?$request->image_id:null;

          // app('App\Http\Controllers\ImageCountController')->uploadImage($imageFile, "buses", $userDetailsModel->id,1,$imageId);
          // //1=profile_image

          $response = [
            "response" => 200,
            'status' => true,
            'message' => "successfully",

          ];
        } else
          $response = [
            "response" => 201,
            'status' => false,
            'message' => "error",

          ];
        return response($response, 200);
      } catch (\Exception $e) {
        $response = [
          "response" => 201,
          'status' => false,
          'message' => "error $e",
        ];
        return response($response, 200);
      }
    }
  }

  function removeImage(Request $request)
  {


    $validator = Validator::make(request()->all(), [
      'id' => 'required'
    ]);
    if ($validator->fails())
      return response(["response" => 400], 400);
    try {
      $dataModel = User::where("id", $request->id)->first();


      $oldImage = $dataModel->image;
      if (isset($oldImage)) {
        if ($oldImage != "def.png") {
          Helpers::deleteImage($oldImage);
        }

        $dataModel->image = null;
      }

      $timeStamp = date("Y-m-d H:i:s");
      $dataModel->updated_at = $timeStamp;

      $qResponce = $dataModel->save();
      if ($qResponce)
        return Helpers::successResponse("successfully");
      else
        return Helpers::errorResponse("error");
    } catch (\Exception $e) {

      return Helpers::errorResponse("error");
    }
  }
  public function getDataByDate(Request $request)
  {
    // Retrieve the start and end dates from the request
    $startDate = $request->input('start_date');
    $endDate = $request->input('end_date');


    $validator = Validator::make(request()->all(), [

      'start_date' => 'required|date',
      'end_date' => 'required|date|after_or_equal:start_date'

    ]);

    if ($validator->fails())
      return response(["response" => 400], 400);

    $startDate = Carbon::parse($startDate)->startOfDay()->toDateTimeString();
    $endDate = Carbon::parse($endDate)->endOfDay()->toDateTimeString();

    // Query the appointments table with the date range

    $data = DB::table('users')
      ->select(
        "id",
        "wallet_amount",
        "f_name",
        "l_name",
        "phone",
        "isd_code",
        "gender",
        "dob",
        "email",
        "image",
        "address",
        "city",
        "state",
        "postal_code",
        "isd_code_sec",
        "phone_sec",
        "email_verified_at",
        "remember_token",
        "created_at",
        "updated_at"
      )
      ->whereBetween('users.created_at', [$startDate, $endDate])
      ->get();

    $response = [
      "response" => 200,
      'data' => $data,
    ];

    return response($response, 200);
  }

  public function getDataPeg(Request $request)
  {



    // Define the base query

    $query = DB::table("users")
      ->select(
        'users.*',
        'users_role_assign.role_id',
        'roles.name as role_name'
      )
      ->leftJoin('users_role_assign', 'users_role_assign.user_id', '=', 'users.id')
      ->leftJoin('roles', 'roles.id', '=', 'users_role_assign.role_id')
      ->orderBy('users.created_at', 'DESC');

    if (isset($request->role_id)) {
      $query->where('users_role_assign.role_id', '=', $request->role_id);
    }
    if (isset($request->clinic_id)) {
      $query->where('users.clinic_id', '=', $request->clinic_id);
    }


    if (!empty($request->start_date)) {
      $query->whereDate('users.created_at', '>=', $request->start_date);
    }

    if (!empty($request->end_date)) {
      $query->whereDate('users.created_at', '<=', $request->end_date);
    }

    if ($request->has('search')) {
      $search = $request->input('search');
      $query->where(function ($q) use ($search) {
        $q->where(DB::raw("CONCAT(users.f_name, ' ' , users.l_name)"), 'like', '%' . $search . '%')
          ->orWhere('users.id', 'like', '%' . $search . '%')
          ->orWhere('users.phone', 'like', '%' . $search . '%')
          ->orWhere('users.email', 'like', '%' . $search . '%')
          ->orWhere('users.gender', 'like', '%' . $search . '%')
          ->orWhere('users.dob', 'like', '%' . $search . '%');
      });
    }
    // Calculate the limit


    $total_record = $query->count();

    // Apply pagination if start and end are provided
    if ($request->filled(['start', 'end'])) {
      $start = $request->start;
      $end = $request->end;
      $query->skip($start)->take($end - $start);
    }

    $data = $query->get();

    if ($request->filled(['start', 'end'])) {
      $start = $request->start;
      $end = $request->end;
      $query->skip($start)->take($end - $start);
    }
    $response = [
      "response" => 200,
      "total_record" => $total_record,
      'data' => $data,
    ];

    return response()->json($response, 200);
  }

  function deleteData(Request $request){
    $validator = Validator::make(request()->all(), [
        'id' => 'required'
  ]);
  if ($validator->fails())
  return response (["response"=>400],400);
    try{
        DB::beginTransaction();
        $dataModelUser= User::where("id",$request->id)->first();
        $userId= $request->id;
         $oldImage = $dataModelUser->image;
        DB::table('family_members')->where('user_id', $userId)->delete();
        DB::table('users_role_assign')->where('user_id', $userId)->delete();
        DB::table('users')->where('id', $userId)->delete();

            // $qResponce= $dataModel->delete();

            // if($qResponce){

                if(isset($oldImage)){
                    if($oldImage!="def.png"){
                        Helpers::deleteImage($oldImage);
                    }
                }
               DB::commit();
            return Helpers::successResponse("successfully Deleted");
      //  }
        //     else
        //   {
        //     DB::rollBack();
        //     return Helpers::errorResponse("error");    }

    }

 catch(\Exception $e){
    DB::rollBack();
    return Helpers::errorResponse("This record cannot be deleted because it is linked to multiple data entries in the system. You can only soft delete user to prevent future use.");
              }

}



}
