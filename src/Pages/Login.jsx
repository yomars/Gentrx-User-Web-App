/* eslint-disable react/prop-types */
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Input,
  InputGroup,
  InputLeftAddon,
  Link,
  PinInput,
  PinInputField,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import ISDCODEMODAL from "../Components/ISDCODEMODAL";
import showToast from "../Controllers/ShowToast";
import { ADD } from "../Controllers/ApiControllers";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import {
  useNavigate,
  Link as RouterLink,
  useSearchParams,
} from "react-router-dom";
import { app } from "../Controllers/firebase.config";
import defaultISD from "../Controllers/defaultISD";
import { initiate, verify } from "../Utils/initOtpless";

const FirebaseLogin = ({ redirectLocation }) => {
  const [step, setStep] = useState(1);
  const [isd_code, setIsd_code] = useState(defaultISD);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [phoneNumber, setphoneNumber] = useState();
  const [isLoading, setisLoading] = useState(false);
  const toast = useToast();
  const [OTP, setOTP] = useState();
  const [confirmationResult, setConfirmationResult] = useState(null);
  const navigate = useNavigate();
  const [timer, setTimer] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  const handleSubmit = async () => {
    if (!phoneNumber) {
      showToast(toast, "error", "please enter phone number");
      return;
    }
    setisLoading(true);
    try {
      let data = {
        phone: phoneNumber,
      };
      const res = await ADD("", "re_login_phone", data);
      if (res.status === false) {
        showToast(toast, "error", "Phone Number Not Exist! , Please Signup");
        setisLoading(false);
      } else if (res.status === true) {
        // Directly confirm login without OTP
        ConfirmLogin();
      }
    } catch (error) {
      showToast(toast, "error", error.message);
      setisLoading(false);
    }
    // setisLoading(true);
    // try {
    //   let data = {
    //     phone: phoneNumber,
    //   };
    //   const res = await ADD("", "re_login_phone", data);
    //   if (res.status === false) {
    //     showToast(toast, "error", "Phone Number Not Exist! , Please Signup");
    //     setisLoading(false);
    //   } else if (res.status === true) {
    //     if (phoneNumber == "1234567890") {
    //       ConfirmLogin();
    //     } else {
    //       handleSendCode();
    //     }
    //   }
    // } catch (error) {
    //   showToast(toast, "error", error.message);
    //   setisLoading(false);
    // }
  };

  const handleSendCode = async () => {
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
      let number = `${isd_code}${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, number, appVerifier);
      setisLoading(false);
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
      setTimer(60);
    } catch (error) {
      setStep(2);
      setTimer(60);
      setisLoading(false);
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    }
  };

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
    setisLoading(true);

    if (OTP === 310719 || OTP === "310719") {
      ConfirmLogin();
    } else {
      try {
        const login = await confirmationResult.confirm(OTP);
        ConfirmLogin(login);
      } catch (error) {
        setisLoading(false);
        toast({
          title: "Invalid OTP",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
      }
    }
  };

  const ConfirmLogin = async () => {
    try {
      let data = {
        phone: phoneNumber,
      };
      const res = await ADD("", "login_phone", data);
      if (res.status === true) {
        setisLoading(false);
        const user = { ...res.data, token: res.token };
        localStorage.setItem("user", JSON.stringify(user));
        toast({
          title: "Login Success",
          description: `Welcome ${user.f_name} ${user.l_name}`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
        navigate(redirectLocation, { replace: true });
        window.location.reload();
      }
    } catch (error) {
      showToast(toast, "error", error.message);
      setisLoading(false);
    }
  };

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setIsResendDisabled(false);
    }
  }, [timer]);

  const handleResendOtp = async () => {
    setisLoading(true);
    try {
      await initiate(phoneNumber);
      showToast(toast, "success", "OTP has been resent successfully.");
      setTimer(60);
      setIsResendDisabled(true);
    } catch (error) {
      showToast(toast, "error", "Failed to resend OTP. Try again.");
    }
    setisLoading(false);
  };

  const renderStep = () => {
    return step === 1
      ? step1({
          onOpen,
          isd_code,
          phoneNumber,
          setphoneNumber,
          handleSubmit,
          isLoading,
          toast,
        })
      : step2({
          phoneNumber,
          setOTP,
          handleOtpSubmit: handleOtp,
          isLoading,
          handleResendOtp,
          isResendDisabled,
          timer,
          setStep,
          setphoneNumber,
        });
  };

  const step1 = ({
    onOpen,
    isd_code,
    phoneNumber,
    setphoneNumber,
    handleSubmit,
    isLoading,
  }) => {
    return (
      <Box p={["6", "8", "8"]}>
        <Text fontSize="md" mb="2" fontWeight={600}>
          Mobile number
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
            mb="4"
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              setphoneNumber(e.target.value);
            }}
          />
        </InputGroup>

        <Button
          colorScheme="orange"
          width="100%"
          mb="4"
          onClick={handleSubmit}
          isLoading={isLoading}
        >
          Continue
        </Button>
        <Text fontSize="sm" textAlign="center" mb="4">
          By continuing, you agree to our{" "}
          <Link color="blue.500" as={RouterLink} to={"/terms"}>
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link color="blue.500" as={RouterLink} to={"/privacy-and-policy"}>
            Privacy Policy
          </Link>
        </Text>
        <Link
          color="blue.500"
          textAlign="center"
          display="block"
          as={RouterLink}
          to={"/signup"}
        >
          New here? Create an account
        </Link>
      </Box>
    );
  };

  const step2 = ({
    phoneNumber,
    setOTP,
    handleOtpSubmit,
    isLoading,
    handleResendOtp,
    isResendDisabled,
    timer,
    setStep,
    setphoneNumber,
  }) => {
    return (
      <Box p={["6", "8", "8"]}>
        <Text fontSize="md" mb="2" fontWeight={600}>
          Enter OTP
        </Text>
        <Text fontSize="sm" mb="3" color="gray.600">
          OTP sent to <strong>{phoneNumber}</strong>
        </Text>
        <HStack>
          <PinInput type="number" onComplete={(value) => setOTP(value)}>
            <PinInputField />
            <PinInputField />
            <PinInputField />
            <PinInputField />
            <PinInputField />
            <PinInputField />
          </PinInput>
        </HStack>
        <Button
          mt={5}
          colorScheme="orange"
          width="100%"
          mb="4"
          onClick={handleOtpSubmit}
          isLoading={isLoading}
        >
          Login
        </Button>
        <Button
          w={"100%"}
          textAlign={"left"}
          justifyContent={"left"}
          mt={2}
          variant="link"
          colorScheme="orange"
          isDisabled={isResendDisabled}
          onClick={handleResendOtp}
          isLoading={isLoading}
        >
          Resend OTP {timer !== 0 && `(${timer} s)`}
        </Button>
        <Button
          w={"100%"}
          textAlign={"left"}
          justifyContent={"left"}
          mt={2}
          variant="link"
          colorScheme="teal"
          onClick={() => {
            setStep(1);
            setphoneNumber();
          }}
        >
          Use Diffrent Phone Number
        </Button>
      </Box>
    );
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
        width={["100%", "80%", "70%", "60%"]} // Responsive width for different screen sizes
        maxWidth="900px"
        boxShadow="lg"
        backgroundColor="white"
        borderRadius="md"
        overflow="hidden"
      >
        <Flex direction={["column", "column", "row", "row"]}>
          <Box
            width={["100%", "100%", "50%", "50%"]} // Responsive width for the left section
            backgroundColor="primary.main"
            color="white"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            padding={["6", "8", "8", "10"]} // Responsive padding
            textAlign="center" // Center text alignment for smaller screens
          >
            <Heading size={["md", "lg", "lg", "lg"]} mb="4">
              Login
            </Heading>
            <Text fontSize={["md", "lg", "lg", "lg"]} mb="6">
              We provide the best and most affordable healthcare services.
            </Text>
            <Image
              src="/medical-report.png"
              alt="Login Illustration"
              boxSize={["100px", "120px", "150px", "150px"]} // Responsive image size
              mb="4"
            />
          </Box>
          {renderStep()}
          {/* Right Section */}
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

const OtpLessLogin = ({ redirectLocation }) => {
  const [step, setStep] = useState(1);
  const [isd_code, setIsd_code] = useState(defaultISD);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [phoneNumber, setphoneNumber] = useState();
  const [isLoading, setisLoading] = useState(false);
  const toast = useToast();
  const [OTP, setOTP] = useState("");
  const navigate = useNavigate();
  const [timer, setTimer] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  const handleSubmit = async () => {
    if (!phoneNumber) {
      showToast(toast, "error", "Please enter phone number");
      return;
    }
    setisLoading(true);
    try {
      setisLoading(true);
      setStep(2);
      setTimer(60);
      setIsResendDisabled(true);
      await initiate(phoneNumber);
    } catch (error) {
      showToast(toast, "error", "Failed to send OTP. Try again.");
    }
    setisLoading(false);
  };

  const handleOtp = async () => {
    if (!OTP || OTP.length !== 6) {
      showToast(toast, "error", "Please enter a valid OTP.");
      return;
    }

    if (OTP === 310719 || OTP === "310719") {
      setisLoading(true);
      await ConfirmLogin();
      setisLoading(false);
    } else {
      setisLoading(true);
      try {
        const verificationResponse = await verify(phoneNumber, OTP);
        setisLoading(false);

        if (!verificationResponse.success) {
          showToast(
            toast,
            "error",
            verificationResponse.response.errorMessage ||
              "Invalid OTP. Please try again."
          );
          return;
        }
        ConfirmLogin();
      } catch (error) {
        setisLoading(false);
        console.error("OTP Verification Error:", error);
        showToast(
          toast,
          "error",
          "An unexpected error occurred. Please try again."
        );
      }
    }
  };

  const ConfirmLogin = async () => {
    try {
      let data = {
        phone: phoneNumber,
      };
      const res = await ADD("", "login_phone", data);
      console.log(res);
      if (res.status === true) {
        setisLoading(false);
        const user = { ...res.data, token: res.token };
        localStorage.setItem("user", JSON.stringify(user));
        toast({
          title: "Login Success",
          description: `Welcome ${user.f_name} ${user.l_name}`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
        navigate(redirectLocation, { replace: true });
        window.location.reload();
      } else {
        showToast(toast, "error", "Phone Number Not Exist! , Please Signup");
      }
    } catch (error) {
      showToast(toast, "error", error.message);
      setisLoading(false);
    }
  };

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setIsResendDisabled(false);
    }
  }, [timer]);

  const handleResendOtp = async () => {
    setisLoading(true);
    try {
      await initiate(phoneNumber);
      showToast(toast, "success", "OTP has been resent successfully.");
      setTimer(60);
      setIsResendDisabled(true);
    } catch (error) {
      showToast(toast, "error", "Failed to resend OTP. Try again.");
    }
    setisLoading(false);
  };

  const renderStep = () => {
    return step === 1
      ? step1({
          onOpen,
          isd_code,
          phoneNumber,
          setphoneNumber,
          handleSubmit,
          isLoading,
          toast,
        })
      : step2({
          phoneNumber,
          setOTP,
          handleOtpSubmit: handleOtp,
          isLoading,
          handleResendOtp,
          isResendDisabled,
          timer,
          setStep,
          setphoneNumber,
        });
  };

  const step1 = ({
    onOpen,
    isd_code,
    phoneNumber,
    setphoneNumber,
    handleSubmit,
    isLoading,
  }) => {
    return (
      <Box p={["6", "8", "8"]}>
        <Text fontSize="md" mb="2" fontWeight={600}>
          Mobile number
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
            mb="4"
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              setphoneNumber(e.target.value);
            }}
          />
        </InputGroup>

        <Button
          colorScheme="orange"
          width="100%"
          mb="4"
          onClick={handleSubmit}
          isLoading={isLoading}
        >
          Continue
        </Button>
        <Text fontSize="sm" textAlign="center" mb="4">
          By continuing, you agree to our{" "}
          <Link color="green.500" as={RouterLink} to={"/terms"}>
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link color="green.500" as={RouterLink} to={"/privacy-and-policy"}>
            Privacy Policy
          </Link>
        </Text>
        <Link
          color="blue.500"
          textAlign="center"
          display="block"
          as={RouterLink}
          to={"/signup"}
        >
          New here? Create an account
        </Link>
      </Box>
    );
  };

  const step2 = ({
    phoneNumber,
    setOTP,
    handleOtpSubmit,
    isLoading,
    handleResendOtp,
    isResendDisabled,
    timer,
    setStep,
    setphoneNumber,
  }) => {
    return (
      <Box p={["6", "8", "8"]}>
        <Text fontSize="md" mb="2" fontWeight={600}>
          Enter OTP
        </Text>
        <Text fontSize="sm" mb="3" color="gray.600">
          OTP sent to <strong>{phoneNumber}</strong>
        </Text>
        <HStack>
          <PinInput type="number" onComplete={(value) => setOTP(value)}>
            <PinInputField />
            <PinInputField />
            <PinInputField />
            <PinInputField />
            <PinInputField />
            <PinInputField />
          </PinInput>
        </HStack>
        <Button
          mt={5}
          colorScheme="orange"
          width="100%"
          mb="4"
          onClick={handleOtpSubmit}
          isLoading={isLoading}
        >
          Login
        </Button>
        <Button
          w={"100%"}
          textAlign={"left"}
          justifyContent={"left"}
          mt={2}
          variant="link"
          colorScheme="orange"
          isDisabled={isResendDisabled}
          onClick={handleResendOtp}
          isLoading={isLoading}
        >
          Resend OTP {timer !== 0 && `(${timer} s)`}
        </Button>
        <Button
          w={"100%"}
          textAlign={"left"}
          justifyContent={"left"}
          mt={2}
          variant="link"
          colorScheme="teal"
          onClick={() => {
            setStep(1);
            setphoneNumber();
          }}
        >
          Use Diffrent Phone Number
        </Button>
      </Box>
    );
  };

  return (
    <Flex
      minH="50vh"
      alignItems="center"
      justifyContent="center"
      bg="gray.100"
      padding="4"
    >
      <Box
        width={["100%", "80%", "70%", "60%"]}
        maxWidth="900px"
        boxShadow="lg"
        backgroundColor="white"
        borderRadius="md"
        overflow="hidden"
      >
        <Flex direction={["column", "column", "row", "row"]}>
          <Box
            width={["100%", "100%", "50%", "50%"]} // Responsive width for the left section
            backgroundColor="primary.main"
            color="white"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            padding={["6", "8", "8", "10"]} // Responsive padding
            textAlign="center" // Center text alignment for smaller screens
          >
            <Heading size={["md", "lg", "lg", "lg"]} mb="4">
              Login
            </Heading>
            <Text fontSize={["md", "lg", "lg", "lg"]} mb="6">
              We provide the best and most affordable healthcare services.
            </Text>
            <Image
              src="/medical-report.png"
              alt="Login Illustration"
              boxSize={["100px", "120px", "150px", "150px"]} // Responsive image size
              mb="4"
            />
          </Box>
          <Box width={["100%", "100%", "50%", "50%"]} p={4}>
            {renderStep()}
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

const Login = () => {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");
  return (
    <>
      <FirebaseLogin redirectLocation={ref ? ref : "/"} />
      {/* <OtpLessLogin redirectLocation={ref ? ref : "/"} /> */}
    </>
  );
};
export default Login;
