import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightElement,
  Link,
  Select,
  Text,
  useDisclosure,
  useToast,
  FormControl,
  FormErrorMessage,
  Image,
  IconButton,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import ISDCODEMODAL from "../Components/ISDCODEMODAL";
import showToast from "../Controllers/ShowToast";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useState, useEffect } from "react";
import defaultISD from "../Controllers/defaultISD";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { setStorageItem } from "../lib/storage";
import api from "../Controllers/api";
import {
  ensurePatientAuthBackendReady,
  getAuthEndpoint,
} from "../Controllers/authConfig";

const Signup = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isd_code, setIsd_code] = useState(defaultISD);
  const toast = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [clinics, setClinics] = useState([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);

  // OTP step state
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [verificationToken, setVerificationToken] = useState(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Countdown timer for OTP resend button
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  // Fetch active clinics for the signup dropdown on mount
  useEffect(() => {
    let cancelled = false;
    const fetchClinics = async () => {
      try {
        const res = await fetch(`${api}/patient/clinics`);
        if (!res.ok) throw new Error('Failed to load clinics');
        const json = await res.json();
        const list = json?.data ?? json ?? [];
        if (!cancelled) setClinics(Array.isArray(list) ? list : []);
      } catch {
        // Non-fatal: form validation will catch an empty selection
        if (!cancelled) setClinics([]);
      } finally {
        if (!cancelled) setClinicsLoading(false);
      }
    };
    fetchClinics();
    return () => { cancelled = true; };
  }, []);

  const {
    handleSubmit,
    register,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm();

  const password = watch("password");

  const postAuthJson = async (endpoint, payload) => {
    const response = await fetch(`${api}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const message =
        body?.message ||
        body?.error ||
        `Request failed with status code ${response.status}`;
      throw new Error(message);
    }

    return body || {};
  };

  const checkMobileExists = async (number) => {
    // Ensure we have a valid phone number
    const normalizedPhone = String(number || "").trim();
    if (!normalizedPhone) {
      throw new Error("Phone number is required");
    }

    const checkEndpoint = getAuthEndpoint('checkPhone');
    const res = await postAuthJson(checkEndpoint, { phone: normalizedPhone });

    const available =
      typeof res?.available === "boolean"
        ? res.available
        : typeof res?.data?.available === "boolean"
        ? res.data.available
        : null;

    if (available !== null) {
      return !available;
    }

    const exists =
      typeof res?.exists === "boolean"
        ? res.exists
        : typeof res?.data?.exists === "boolean"
        ? res.data.exists
        : null;

    if (exists !== null) {
      return exists;
    }

    if (typeof res?.message === "string") {
      const msg = res.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return true;
      }
    }

    // Safe fallback: avoid blocking new signups when backend omits availability fields.
    return false;
  };

  const onSubmit = async (values) => {
    // Guard: if OTP step is already showing, do not re-send OTP
    if (showOtpStep) return;

    const { f_name, l_name, phone, gender, email, password } = values;
    const fullName = [f_name, l_name].filter(Boolean).join(" ").trim();
    const normalizedPhone = sanitizePhone(phone);

    try {
      await ensurePatientAuthBackendReady();

      // Check if phone number already exists
      if ((await checkMobileExists(normalizedPhone)) === true) {
        return toast({
          title: "Phone number already exists!",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
      }

      // --- OTP gate: send OTP and show verification step ---
      const sendRes = await postAuthJson(getAuthEndpoint('sendOtp'), { phone: normalizedPhone });
      if (!sendRes?.status) {
        showToast(toast, "error", sendRes?.error || "Failed to send OTP. Please try again.");
        return;
      }

      setPendingFormValues({
        name: fullName,
        f_name,
        l_name,
        phone: normalizedPhone,
        isd_code,
        gender,
        email,
        password,
        clinic_id: values.clinic_id,
      });
      setOtpValue("");
      setResendTimer(60);
      setShowOtpStep(true);

      toast({
        title: "OTP Sent",
        description: `A 6-digit verification code was sent to +63${normalizedPhone}`,
        status: "info",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    } catch (error) {
      showToast(toast, "error", error.message);
    }
  };

  const handleOtpVerify = async () => {
    if (otpValue.length !== 6) {
      showToast(toast, "error", "Please enter the 6-digit code.");
      return;
    }
    setOtpLoading(true);
    try {
      const verifyRes = await postAuthJson(getAuthEndpoint('verifyOtp'), {
        phone: pendingFormValues.phone,
        otp: otpValue,
      });

      if (!verifyRes?.status) {
        showToast(toast, "error", verifyRes?.error || "Invalid OTP. Please try again.");
        setOtpLoading(false);
        return;
      }

      const vToken = verifyRes.verification_token;
      setVerificationToken(vToken);

      // Now register the patient with the verified token
      const signupPayload = { ...pendingFormValues, verification_token: vToken };
      const res = await postAuthJson(getAuthEndpoint('signup'), signupPayload);
      const isSignupSuccess = res?.status === true || res?.success === true || res?.response === 201;

      if (isSignupSuccess) {
        const token = res?.token || res?.data?.token;
        const user = { ...res.data, token };
        setStorageItem("user", JSON.stringify(user));
        const patientCode = res.data?.patient_code || res?.patient_code;
        toast({
          title: "Signup Successful",
          description: `Welcome ${user.f_name} ${user.l_name}${patientCode ? ` • Patient ID: ${patientCode}` : ""}`,
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
        setTimeout(() => {
          navigate("/", { replace: true });
          window.location.reload();
        }, 2000);
      } else {
        showToast(toast, "error", res.message || "Signup failed");
      }
    } catch (error) {
      showToast(toast, "error", error.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    try {
      const sendRes = await postAuthJson(getAuthEndpoint('sendOtp'), { phone: pendingFormValues.phone });
      if (sendRes?.status) {
        setResendTimer(60);
        setOtpValue("");
        toast({ title: "OTP Resent", status: "info", duration: 3000, isClosable: true, position: "top" });
      } else {
        showToast(toast, "error", sendRes?.error || "Failed to resend OTP.");
      }
    } catch (error) {
      showToast(toast, "error", error.message);
    }
  };

  // Sanitise mobile input: digits only, strip leading zeros
  const sanitizePhone = (raw) => String(raw || "").replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
  const phoneField = register("phone", {
    required: "Phone number is required",
    pattern: {
      value: /^[0-9]{10}$/,
      message: "Phone number must be exactly 10 digits",
    },
  });

  return (
    <Flex
      minH="100vh"
      alignItems="center"
      justifyContent="center"
      bg="white"
      padding="4"
    >
      <Box
        width={["100%", "100%", "95%", "95%"]}
        maxWidth="1400px"
        boxShadow={["none", "none", "lg", "lg"]}
        backgroundColor="white"
        borderRadius="md"
        overflow="hidden"
      >
        <Flex direction={["column", "column", "row", "row"]} minH={["auto", "auto", "100vh", "100vh"]}>
          {/* Left side - Form */}
          <Box 
            width={["100%", "100%", "50%", "50%"]} 
            p={["6", "8", "8", "12"]}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            bg="white"
          >
            <Heading
              color="#34C38F"
              fontSize={["20px", "25px", "34px", "30px"]}
              mb="6"
              fontWeight={600}
              lineHeight={1.2}
            >
              We are always ensure best medical treatment for your health
            </Heading>
            
            <Text 
              fontSize={["14px", "16px"]}
              color="#2f3848" 
              mb="8"
              fontWeight={500}
              lineHeight={1.6}
            >
              For questions or concerns related to data retention, you may contact: GentRx Data Protection Team info@gentrx.ph Santusan Street, Barangay Manggahan, General Trias, Cavite +63 995 514 8229
            </Text>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* ---- OTP verification step ---- */}
              {showOtpStep ? (
                <Box>
                  <Text fontWeight={600} color="#2f3848" mb="2" fontSize="15px">
                    Verify your mobile number
                  </Text>
                  <Text color="#555" fontSize="13px" mb="4">
                    A 6-digit code was sent to +63{pendingFormValues?.phone}. Enter it below.
                  </Text>

                  <Input
                    placeholder="6-digit code"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    borderColor="#ddd"
                    _focus={{ borderColor: "#34C38F", boxShadow: "0 0 0 1px #34C38F" }}
                    fontSize="22px"
                    letterSpacing="0.3em"
                    textAlign="center"
                    mb="4"
                  />

                  <Button
                    type="button"
                    bg="#005FCC"
                    color="white"
                    width="100%"
                    mb="3"
                    isLoading={otpLoading}
                    onClick={handleOtpVerify}
                    fontWeight={600}
                    fontSize="16px"
                    h="52px"
                    borderRadius="999px"
                    _hover={{ bg: "#0047A3" }}
                  >
                    Verify &amp; Create Account
                  </Button>

                  <Flex justify="space-between" align="center">
                    <Button
                      type="button"
                      variant="link"
                      color={resendTimer > 0 ? "#aaa" : "#005FCC"}
                      fontSize="13px"
                      isDisabled={resendTimer > 0}
                      onClick={handleResendOtp}
                    >
                      {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      color="#999"
                      fontSize="13px"
                      onClick={() => { setShowOtpStep(false); setOtpValue(""); }}
                    >
                      &larr; Back
                    </Button>
                  </Flex>
                </Box>
              ) : (
                <>
              {/* First Name and Last Name in one row */}
              <Flex gap={4} mb="4" direction={["column", "column", "row", "row"]}>
                <FormControl isInvalid={errors.f_name} flex={1}>
                  <Input
                    placeholder="First Name"
                    {...register("f_name", {
                      required: "First name is required",
                    })}
                    borderColor="#ddd"
                    _focus={{ borderColor: "#34C38F", boxShadow: "0 0 0 1px #34C38F" }}
                  />
                  <FormErrorMessage>{errors.f_name?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={errors.l_name} flex={1}>
                  <Input
                    placeholder="Last Name"
                    {...register("l_name", {
                      required: "Last name is required",
                    })}
                    borderColor="#ddd"
                    _focus={{ borderColor: "#34C38F", boxShadow: "0 0 0 1px #34C38F" }}
                  />
                  <FormErrorMessage>{errors.l_name?.message}</FormErrorMessage>
                </FormControl>
              </Flex>

              {/* Phone Number */}
              <FormControl isInvalid={errors.phone} mb="4">
                <InputGroup size="md">
                  <InputLeftAddon
                    cursor="pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen();
                    }}
                    bg="white"
                    borderColor="#ddd"
                  >
                    {isd_code}
                  </InputLeftAddon>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Mobile Number"
                    maxLength={10}
                    {...phoneField}
                    onChange={(e) => {
                      const clean = sanitizePhone(e.target.value);
                      e.target.value = clean;
                      phoneField.onChange(e);
                    }}
                    borderColor="#ddd"
                    _focus={{ borderColor: "#34C38F", boxShadow: "0 0 0 1px #34C38F" }}
                  />
                </InputGroup>
                <FormErrorMessage>{errors.phone?.message}</FormErrorMessage>
              </FormControl>

              {/* Gender */}
              <FormControl isInvalid={errors.gender} mb="4">
                <Select 
                  placeholder="Select your gender" 
                  {...register("gender", {
                    required: "Please select your gender"
                  })}
                  borderColor="#ddd"
                  _focus={{ borderColor: "#34C38F", boxShadow: "0 0 0 1px #34C38F" }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Select>
                <FormErrorMessage>{errors.gender?.message}</FormErrorMessage>
              </FormControl>

              {/* Email */}
              <FormControl isInvalid={errors.email} mb="4">
                <Input
                  type="email"
                  placeholder="Email Address"
                  {...register("email", {
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Invalid email address",
                    },
                  })}
                  borderColor="#ddd"
                  _focus={{ borderColor: "#34C38F", boxShadow: "0 0 0 1px #34C38F" }}
                />
                <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
              </FormControl>

              {/* Clinic selection — used to generate the Patient ID server-side */}
              <FormControl isInvalid={errors.clinic_id} mb="4">
                <Select
                  placeholder={clinicsLoading ? "Loading clinics\u2026" : "Select your clinic"}
                  {...register("clinic_id", { required: "Please select a clinic" })}
                  borderColor="#ddd"
                  _focus={{ borderColor: "#34C38F", boxShadow: "0 0 0 1px #34C38F" }}
                  disabled={clinicsLoading}
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.clinic_id?.message}</FormErrorMessage>
              </FormControl>

              {/* PIN - 4 digits */}
              <FormControl isInvalid={errors.password} mb="4">
                <InputGroup size="md">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your 4-digit PIN"
                    maxLength={4}
                    {...register("password", {
                      required: "PIN is required",
                      pattern: {
                        value: /^[0-9]{4}$/,
                        message: "PIN must be exactly 4 digits",
                      },
                    })}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, '');
                    }}
                    borderColor="#ddd"
                    _focus={{ borderColor: "#34C38F", boxShadow: "0 0 0 1px #34C38F" }}
                  />
                  <InputRightElement>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide PIN" : "Show PIN"}
                    />
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
              </FormControl>

              {/* Confirm PIN - 4 digits */}
              <FormControl isInvalid={errors.confirm_password} mb="6">
                <InputGroup size="md">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your 4-digit PIN"
                    maxLength={4}
                    {...register("confirm_password", {
                      required: "Please confirm your PIN",
                      pattern: {
                        value: /^[0-9]{4}$/,
                        message: "PIN must be exactly 4 digits",
                      },
                      validate: (value) =>
                        value === password || "PINs do not match",
                    })}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, '');
                    }}
                    borderColor="#ddd"
                    _focus={{ borderColor: "#34C38F", boxShadow: "0 0 0 1px #34C38F" }}
                  />
                  <InputRightElement>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide PIN" : "Show PIN"}
                    />
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>{errors.confirm_password?.message}</FormErrorMessage>
              </FormControl>

              <Button
                bg="#005FCC"
                color="white"
                width="100%"
                mb="4"
                isLoading={isSubmitting}
                type="submit"
                fontWeight={600}
                fontSize="16px"
                h="52px"
                borderRadius="999px"
                _hover={{ bg: "#0047A3" }}
              >
                Sign Up
              </Button>
            </>
            )}
            </form>

            <Text fontSize="sm" textAlign="center" mb="3" color="#2f3848">
              By continuing, you agree to our{" "}
              <Link color="#005FCC" as={RouterLink} to={"/terms"} fontWeight={600}>
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link color="#005FCC" as={RouterLink} to={"/privacy-and-policy"} fontWeight={600}>
                Privacy Policy
              </Link>
            </Text>
            <Text textAlign="center" fontSize="sm" color="#2f3848">
              Already have an account?{" "}
              <Link color="#005FCC" as={RouterLink} to={"/login"} fontWeight={600}>
                Log In
              </Link>
            </Text>
          </Box>

          {/* Right side - Doctor Image with overlay */}
          <Box
            width={["100%", "100%", "50%", "50%"]}
            bg="#f0f7f4"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            p={["6", "8", "8", "12"]}
            position="relative"
            minH={["400px", "500px", "100vh", "100vh"]}
          >
            <Image
              src="/images/signup-hero.png"
              alt="Doctor"
              w={{ base: "90%", md: "100%" }}
              maxH="600px"
              objectFit="contain"
              mb="6"
            />
            
            <Box
              bg="#6bc483"
              borderRadius="20px"
              p="8"
              textAlign="center"
              maxW="360px"
            >
              <Heading
                color="white"
                fontSize={{ base: "30px", md: "45px" }}
                fontWeight={600}
                lineHeight={1.5}
              >
                We are ready to serve you
              </Heading>
            </Box>
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
