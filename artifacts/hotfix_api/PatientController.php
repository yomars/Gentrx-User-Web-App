<?php

namespace App\Http\Controllers\Api\V1;

use Carbon\Carbon;
use App\Models\User;
use App\Models\PatientModel;
use Illuminate\Http\Request;
use App\CentralLogics\Helpers;
use App\Models\FamilyMembersModel;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class PatientController extends Controller
{
    //add new data
    function addData(Request $request){

        $validator = Validator::make(request()->all(), [
            'f_name' => 'required',
            'l_name' => 'required',
            'clinic_id' => 'required'
        ]);
        if ($validator->fails())
          return response (["response"=>400],400);

        try{

            $timeStamp= date("Y-m-d H:i:s");
            $dataModel=new PatientModel;

            $dataModel->f_name = $request->f_name ;
            $dataModel->l_name = $request->l_name ;
            $dataModel->clinic_id = $request->clinic_id ;

            if(isset($request->isd_code)){ $dataModel->isd_code = $request->isd_code ;}
            if(isset($request->phone)){ $dataModel->phone = $request->phone;}
            if(isset($request->city)){ $dataModel->city = $request->city ;}
            if(isset($request->state)){ $dataModel->state = $request->state ;}
            if(isset($request->address)){ $dataModel->address = $request->address ;}
            if(isset($request->email)){ $dataModel->email = $request->email ;}
            if(isset($request->gender)){ $dataModel->gender = $request->gender ;}
            if(isset($request->dob)){ $dataModel->dob = $request->dob ;}
            if(isset($request->postal_code)){ $dataModel->postal_code = $request->postal_code ;}
            if(isset($request->notes)){ $dataModel->notes = $request->notes ;}
            if(isset($request->user_id)){ $dataModel->user_id = $request->user_id ;}

            if(isset($request->image)){

                $dataModel->image =  $request->hasFile('image') ? Helpers::uploadImage('patients/', $request->file('image')) : null;
            }
            $dataModel->created_at=$timeStamp;
            $dataModel->updated_at=$timeStamp;

            $qResponce = $dataModel->save();
            if($qResponce){

                // Check if exists in Patient and Family Members

                $userExistsModel = User::where('f_name', $request->f_name)
                    ->where('l_name', $request->l_name)
                    ->where('phone', $request->phone)
                    ->where('is_deleted', '=', false)
                    ->first();
                $userModel = new User();
                $userIDString = "";
                if($userExistsModel){
                    // User already exists, do nothing
                    $userIDString = $userExistsModel->id;
                    $dataModel->user_id=$userIDString;
                    $dataModel->save();
                } else {
                    // Create new User

                    $userModel->f_name = $request->f_name;
                    $userModel->l_name = $request->l_name;
                    $userModel->phone = $request->phone;
                    $userModel->email = $request->email;
                    $userModel->is_deleted = false;
                    $userModel->created_at = $timeStamp;
                    $userModel->updated_at = $timeStamp;
                    $userModel->password = Hash::make("000000"); // Default Password
                    if(isset($request->isd_code)){ $userModel->isd_code = $request->isd_code ;}
                    if(isset($request->phone)){ $userModel->phone = $request->phone;}
                    if(isset($request->city)){ $userModel->city = $request->city ;}
                    if(isset($request->state)){ $userModel->state = $request->state ;}
                    if(isset($request->address)){ $userModel->address = $request->address ;}
                    if(isset($request->email)){ $userModel->email = $request->email ;}
                    if(isset($request->gender)){ $userModel->gender = $request->gender ;}
                    if(isset($request->dob)){ $userModel->dob = $request->dob ;}
                    if(isset($request->postal_code)){ $userModel->postal_code = $request->postal_code ;}
                    if(isset($request->notes)){ $userModel->notes = $request->notes ;}
                    $userModel->save();
                    $userIDString = $userModel->id;
                    $dataModel->user_id=$userIDString;
                    $dataModel->save();
                }


                $dataFamilyMemberExists = FamilyMembersModel::where('f_name', $request->f_name)
                ->where('l_name', $request->l_name)
                ->where('phone', $request->phone)
                ->first();
                if($dataFamilyMemberExists == null){
                    $timeStamp= date("Y-m-d H:i:s");
                    $familyMemberModel=new FamilyMembersModel;

                    $familyMemberModel->f_name = $request->f_name ;
                    $familyMemberModel->l_name = $request->l_name ;
                    $familyMemberModel->user_id = $userIDString;
                    if(isset($request->isd_code)){ $familyMemberModel->isd_code = $request->isd_code ;}
                    if(isset($request->phone)){ $familyMemberModel->phone = $request->phone;}
                    if(isset($request->gender)){ $familyMemberModel->gender = $request->gender ;}
                    if(isset($request->dob)){ $familyMemberModel->dob = $request->dob ;}

                    $familyMemberModel->created_at=$timeStamp;
                    $familyMemberModel->updated_at=$timeStamp;

                    $familyMemberModel->save();
                }
                    return Helpers::successWithIdResponse("successfully",$dataModel->id);
            }
            else{
                return Helpers::errorResponse("error");
            }
        }
        catch(\Exception $e){
            return Helpers::errorResponse("error");
        }
    }

    // Update data
    function updateData(Request $request){
        $validator = Validator::make(request()->all(), [
            'id' => 'required'
        ]);
        if ($validator->fails())
        return response (["response"=>400],400);
        try{
            $dataModel= PatientModel::where("id",$request->id)->first();

            if(isset($request->f_name)){ $dataModel->f_name = $request->f_name ;}
            if(isset($request->l_name)){ $dataModel->l_name = $request->l_name ;}
            if(isset($request->gender)){ $dataModel->gender = $request->gender ;}
            if(isset($request->isd_code)){ $dataModel->isd_code = $request->isd_code ;}
            if(isset($request->phone)){ $dataModel->phone = $request->phone;}
            if(isset($request->city)){ $dataModel->city = $request->city ;}
            if(isset($request->state)){ $dataModel->state = $request->state ;}
            if(isset($request->address)){ $dataModel->address = $request->address ;}
            if(isset($request->email)){ $dataModel->email = $request->email ;}
            if(isset($request->gender)){ $dataModel->gender = $request->gender ;}
            if(isset($request->dob)){ $dataModel->dob = $request->dob ;}
            if(isset($request->postal_code)){ $dataModel->postal_code = $request->postal_code ;}
            if(isset($request->notes)){ $dataModel->notes = $request->notes ;}
            if(isset($request->user_id)){ $dataModel->user_id = $request->user_id ;}

            if(isset($request->image)){
                if($request->hasFile('image') ){
                    $oldImage = $dataModel->image;
                    $dataModel->image =  Helpers::uploadImage('patients/', $request->file('image'));
                    if(isset($oldImage)){
                        if($oldImage!="def.png"){
                            Helpers::deleteImage($oldImage);
                        }
                    }
                }
            }

            $timeStamp= date("Y-m-d H:i:s");

            $dataModel->updated_at=$timeStamp;
                    $qResponce= $dataModel->save();
                    if($qResponce)
                    {

                        return Helpers::successResponse("successfully");
                    }

                    else
                    {

                        return Helpers::errorResponse("error");
                    }
        }


    catch(\Exception $e){
                    return Helpers::errorResponse("error");
                }
    }


    // get data
    public function getData(Request $request)
    {

        // Calculate the limit
        $start = $request->start;
        $end = $request->end;
        $limit = ($end - $start);

        // Define the base query

        $query = DB::table("patients")
        ->select('patients.*',
              'clinics.title'
        )
        ->leftJoin("clinics",'clinics.id','=','patients.clinic_id')

        ->orderBy('patients.created_at','DESC');

            if (!empty($request->start_date)) {
              $query->whereDate('patients.created_at', '>=', $request->start_date);
          }

          if (!empty($request->end_date)) {
              $query->whereDate('patients.created_at', '<=', $request->end_date);
          }

          if ($request->filled('user_id')) {
            $query->where('patients.user_id', '=', $request->user_id);
        }

        if ($request->filled('clinic_id')) {


                  $query->where('patients.clinic_id', '=', $request->clinic_id);
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where(DB::raw("CONCAT(patients.f_name, ' ' , patients.l_name)"), 'ilike', '%' . $search . '%')
                ->orWhere('patients.id', 'ilike', '%' . $search . '%')
                ->orWhere('patients.phone', 'ilike', '%' . $search . '%')
                ->orWhere('patients.city', 'ilike', '%' . $search . '%')
                ->orWhere('patients.state', 'ilike', '%' . $search . '%')
                ->orWhere('patients.address', 'ilike', '%' . $search . '%')
                ->orWhere('patients.email', 'ilike', '%' . $search . '%')
                ->orWhere('patients.gender', 'ilike', '%' . $search . '%')
                ->orWhere('patients.dob', 'ilike', '%' . $search . '%');

            });
        }
        $total_record = $query->get()->count();
        if ($request->filled(['start', 'end'])) {
            $start = (int) $request->start;
            $end = (int) $request->end;
            $query->skip($start)->take($end - $start);
        }

        // Fetch paginated data
        $data = $query->get();




        $response = [
            "response" => 200,
            "total_record" => $total_record,
            'data' => $data,
        ];

        return response()->json($response, 200);
    }


           // get data by id

    function getDataById($id)
    {

            $query = DB::table("patients")
            ->select('patients.*');

            if (is_numeric($id)) {
                $query->where('id', '=', (int) $id);
            } else {
                $query->where('patient_code', '=', $id);
            }

            $data = $query->first();

            $response = [
                "response"=>200,
                'data'=>$data,
            ];

      return response($response, 200);
        }

        function removeImage(Request $request){


            $validator = Validator::make(request()->all(), [
                'id' => 'required'
          ]);
          if ($validator->fails())
          return response (["response"=>400],400);
            try{
                $dataModel= PatientModel::where("id",$request->id)->first();


                    $oldImage = $dataModel->image;
                    if(isset($oldImage)){
                        if($oldImage!="def.png"){
                            Helpers::deleteImage($oldImage);
                        }

                        $dataModel->image=null;
                    }

                    $timeStamp= date("Y-m-d H:i:s");
                    $dataModel->updated_at=$timeStamp;

                        $qResponce= $dataModel->save();
                        if($qResponce)
                        return Helpers::successResponse("successfully");

                        else
                        return Helpers::errorResponse("error");
            }


         catch(\Exception $e){

                        return Helpers::errorResponse("error");
                      }
                    }


   function deleteData(Request $request){

          $validator = Validator::make(request()->all(), [
                            'id' => 'required'  ]);
                      if ($validator->fails())
                      return response (["response"=>400],400);
                        try{
                            DB::beginTransaction();
                            $dataModelUser= PatientModel::where("id",$request->id)->first();

                             $oldImage = $dataModelUser->image;
                                $qResponce= $dataModelUser->delete();

                                if($qResponce){

                                    if(isset($oldImage)){
                                        if($oldImage!="def.png"){
                                            Helpers::deleteImage($oldImage);
                                        }
                                    }
                                   DB::commit();
                                return Helpers::successResponse("successfully Deleted");
                           }
                                else
                              {
                                DB::rollBack();
                                return Helpers::errorResponse("error");    }

                        }

                     catch(\Exception $e){
                        DB::rollBack();
                        return Helpers::errorResponse("This record cannot be deleted because it is linked to multiple data entries in the system.");
                                  }

                    }

        //               function deleteData(Request $request){

        //   $validator = Validator::make(request()->all(), [
        //                     'id' => 'required'  ]);
        //               if ($validator->fails())
        //               return response (["response"=>400],400);
        //                 try{
        //                     DB::beginTransaction();
        //                     $dataModelUser= PatientModel::where("id",$request->id)->first();

        //                      $oldImage = $dataModelUser->image;
        //                         $qResponce= $dataModelUser->delete();

        //                         if($qResponce){

        //                             if(isset($oldImage)){
        //                                 if($oldImage!="def.png"){
        //                                     Helpers::deleteImage($oldImage);
        //                                 }
        //                             }
        //                            DB::commit();
        //                         return Helpers::successResponse("successfully Deleted");
        //                    }
        //                         else
        //                       {
        //                         DB::rollBack();
        //                         return Helpers::errorResponse("error");    }

        //                 }

        //              catch(\Exception $e){
        //                 DB::rollBack();
        //                 return Helpers::errorResponse("This record cannot be deleted because it is linked to multiple data entries in the system.");
        //                           }

        //             }


}
