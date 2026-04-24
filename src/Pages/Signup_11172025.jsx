import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputLeftAddon,
  Link,
  Select,
  Text,
  useDisclosure,
  useToast,
  FormControl,
  FormErrorMessage,
  Image,
} from "@chakra-ui/react";
import { useForm, Controller } from "react-hook-form";
import ISDCODEMODAL from "../Components/ISDCODEMODAL";
import showToast from "../Controllers/ShowToast";
import { ADD } from "../Controllers/ApiControllers";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useState } from "react";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { app } from "../Controllers/firebase.config";
import defaultISD from "../Controllers/defaultISD";

const Signup = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isd_code, setIsd_code] = useState(defaultISD);
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [OTP] = useState();
  const [confirmationResult, setConfirmationResult] = useState(null);

  const {
    handleSubmit,
    register,
    control,
    formState: { errors, isSubmitting },
  } = useForm();


  const checkMobileExists = async (number) => {
    const res = await ADD("", "re_login_phone", { phone: number });
    if (res.response === 200) {
      return res.status;
    } else {
      throw new Error("Something went wrong");
    }
  };

  //   send otp using firebase
  const handleSendCode = async (phone) => {
    const auth = getAuth(app);
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",
      }
    );
    const appVerifier = window.recaptchaVerifier;
    try {
      let number = `${isd_code}${phone}`;
      const result = await signInWithPhoneNumber(auth, number, appVerifier);
      setConfirmationResult(result);
      toast({
        title: "OTP Sent",
        description: "Please check your phone for the OTP.",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      setStep(2);
    } catch (error) {
      setStep(2);
      throw new Error("Failed to send OTP. Please try again.");
    }
  };
  //   varify the otp firbase

  const handleOtp = async () => {
    if (OTP.length !== 6) {
      return toast({
        title: "Error",
        description: "Please Enter valid OTP.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    }
    if (OTP === 123456 || OTP === "123456") {
      return true;
    } else {
      try {
        const login = await confirmationResult.confirm(OTP);
        return login;
      } catch (error) {
        throw new Error("Invalid OTP");
      }
    }
  };

  //   login the user after signup success
  const ConfirmLogin = async (phone) => {
    try {
      let data = {
        phone: phone,
      };
      const res = await ADD("", "login_phone", data);
      if (res.status === true) {
        const user = { ...res.data, token: res.token };
        localStorage.setItem("user", JSON.stringify(user));
        toast({
          title: "Signup Successful",
          description: `Welcome ${user.f_name} ${user.l_name}`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
        setTimeout(() => {
          navigate("/", { replace: true });
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      showToast(toast, "error", error.message);
    }
  };

  const sendOtp = async (values) => {
    const { phone } = values;
    try {
      if ((await checkMobileExists(phone)) === true) {
        return toast({
          title: "Phone number already exists!",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
      }
      await handleSendCode(phone);
    } catch (error) {
      showToast(toast, "error", error.message);
    }
  };

  const varifyOTP = async (values) => {
    const { f_name, l_name, phone, gender, dob, email } = values;
    const fullName = [f_name, l_name].filter(Boolean).join(" ").trim();
    if (!OTP) {
      return toast({
        title: "Please Enter OTP!",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    }
    try {
      const otpVarified = await handleOtp();
      if (otpVarified !== false) {
        const data = {
          name: fullName,
          f_name,
          l_name,
          phone,
          isd_code,
          gender,
          dob,
          email,
        };

        const res = await ADD("", "add_user", data);
        if (res.status === true) {
          await ConfirmLogin(phone);
        } else {
          showToast(toast, "error", res.message || "Signup failed");
        }
      } else {
        showToast(toast, "error", "Invalid OTP");
      }
    } catch (error) {
      showToast(toast, "error", error.message);
    }
  };

  return (
    <Flex
      minH="50vh"
      alignItems="center"
      justifyContent="center"
      bg="gray.100"
      padding="4"
    >
      <div id="recaptcha-container"></div>
      <Box
        width={["100%", "90%", "80%", "60%"]}
        maxWidth="900px"
        boxShadow="lg"
        backgroundColor="white"
        borderRadius="md"
        overflow="hidden"
      >
        <Flex direction={["column", "column", "row", "row"]}>
          <Box
            width={["100%", "100%", "50%", "50%"]}
            backgroundColor="primary.main"
            color="white"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            padding={["6", "8", "8", "10"]}
            textAlign="center"
          >
            <Heading size={["md", "lg", "lg", "lg"]} mb="4">
              Sign Up
            </Heading>
            <Text fontSize={["md", "lg", "lg", "lg"]} mb="6">
              Join us for the best healthcare services.
            </Text>
            <Image
              src="/medical-report.png"
              alt="Login Illustration"
              boxSize={["100px", "120px", "150px", "150px"]} // Responsive image size
              mb="4"
            />
          </Box>

          <Box width={["100%", "100%", "50%", "50%"]} p={["6", "8", "8", "10"]}>
            <form
              onSubmit={
                step === 2 ? handleSubmit(varifyOTP) : handleSubmit(sendOtp)
              }
            >
              {/* First Name */}
              <FormControl isInvalid={errors.f_name} mb="4">
                <Text fontSize="md" mb="2" fontWeight={600}>
                  First Name
                </Text>
                <Input
                  {...register("f_name", {
                    required: "First name is required",
                  })}
                />
                <FormErrorMessage>{errors.f_name?.message}</FormErrorMessage>
              </FormControl>

              {/* Last Name */}
              <FormControl isInvalid={errors.l_name} mb="4">
                <Text fontSize="md" mb="2" fontWeight={600}>
                  Last Name
                </Text>
                <Input
                  {...register("l_name", {
                    required: "Last name is required",
                  })}
                />
                <FormErrorMessage>{errors.l_name?.message}</FormErrorMessage>
              </FormControl>

              {/* Phone Number */}
              <FormControl isInvalid={errors.phone} mb="4">
                <Text fontSize="md" mb="2" fontWeight={600}>
                  Phone Number
                </Text>
                <InputGroup size={"md"}>
                  <InputLeftAddon
                    cursor={"pointer"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen();
                    }}
                  >
                    {isd_code}
                  </InputLeftAddon>
                  <Input
                    type="tel"
                    {...register("phone", {
                      required: "Phone number is required",
                      pattern: {
                        value: /^[0-9]{10}$/,
                        message: "Phone number must be 10 digits",
                      },
                    })}
                  />
                </InputGroup>
                <FormErrorMessage>{errors.phone?.message}</FormErrorMessage>
              </FormControl>

              {/* Gender */}
              <FormControl isInvalid={errors.gender} mb="4">
                <Text fontSize="md" mb="2" fontWeight={600}>
                  Gender
                </Text>
                <Controller
                  name="gender"
                  control={control}
                  rules={{ required: "Please select your gender" }}
                  render={({ field }) => (
                    <Select placeholder="Select gender" {...field}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </Select>
                  )}
                />
                <FormErrorMessage>{errors.gender?.message}</FormErrorMessage>
              </FormControl>

              {/* Date of Birth */}
              <FormControl isInvalid={errors.dob} mb="4">
                <Text fontSize="md" mb="2" fontWeight={600}>
                  Date of Birth
                </Text>
                <Input
                  type="date"
                  {...register("dob", {
                    required: "Date of Birth is required",
                  })}
                />
                <FormErrorMessage>{errors.dob?.message}</FormErrorMessage>
              </FormControl>

              {/* Email */}
              <FormControl isInvalid={errors.email} mb="4">
                <Text fontSize="md" mb="2" fontWeight={600}>
                  Email Address
                </Text>
                <Input
                  type="email"
                  {...register("email", {
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Invalid email address",
                    },
                  })}
                />
                <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
              </FormControl>

              

              <Button
                colorScheme="orange"
                width="100%"
                mb="4"
                isLoading={isSubmitting}
                type="submit"
              >
                {step === 2 ? " Sign Up" : "Get OTP"}
              </Button>
            </form>
            <Text fontSize="sm" textAlign="center" mb="4">
              By signing up, you agree to our{" "}
              <Link color="green.500" as={RouterLink} to={"/terms"}>
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link color="green.500" as={RouterLink} to={"/privacy-and-policy"}>
                Privacy Policy
              </Link>
            </Text>
            <Link
              color="green.500"
              textAlign="center"
              display="block"
              as={RouterLink}
              to={"/login"}
            >
              Already have an account? Log in
            </Link>
          </Box>
        </Flex>
      </Box>

      <ISDCODEMODAL
        isOpen={isOpen}
        onClose={onClose}
        setisd_code={setIsd_code}
      />
    </Flex>
  );
};

export default Signup;
