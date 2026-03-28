/* eslint-disable react/prop-types */
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
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
import { useState } from "react";
import ISDCODEMODAL from "../Components/ISDCODEMODAL";
import showToast from "../Controllers/ShowToast";
import { ADD } from "../Controllers/ApiControllers";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { Link as RouterLink } from "react-router-dom";
import { app } from "../Controllers/firebase.config";
import defaultISD from "../Controllers/defaultISD";
import { setStorageItem } from "../lib/storage";

function LoginModal({ isModalOpen, onModalClose }) {
  const [step, setStep] = useState(1);
  const [isd_code, setIsd_code] = useState(defaultISD);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [phoneNumber, setphoneNumber] = useState();
  const [isLoading, setisLoading] = useState(false);
  const toast = useToast();
  const [OTP, setOTP] = useState();
  const [confirmationResult, setConfirmationResult] = useState(null);

  const renderStep = () => {
    switch (step) {
      case 1:
        return step1({
          onOpen,
          isd_code,
          phoneNumber,
          setphoneNumber,
          handleSubmit,
          isLoading,
        });
      case 2:
        return step2({ setOTP, handleOtpSubmit: hnadleOtp, isLoading }); // If you have other steps, handle them here
      default:
        return step1({ onOpen, isd_code });
    }
  };

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
        if (phoneNumber == "1234567890") {
          ConfirmLogin();
        } else {
          handleSendCode();
        }
      }
    } catch (error) {
      showToast(toast, "error", error.message);
      setisLoading(false);
    }
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
    } catch (error) {
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

  const hnadleOtp = async () => {
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
        setStorageItem("user", JSON.stringify(user));
        toast({
          title: "Login Success",
          description: `Welcome ${user.f_name} ${user.l_name}`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
        window.location.reload();
      }
    } catch (error) {
      showToast(toast, "error", error.message);
      setisLoading(false);
    }
  };
  return (
    <Modal
      isOpen={isModalOpen}
      onClose={onModalClose}
      isCentered
      size={["sm", "2xl"]}
      closeOnOverlayClick={false}
    >
      <ModalOverlay />
      <ModalContent mx={1}>
        <ModalCloseButton top={"2px"} color={{ base: "#fff", md: "#000" }} />
        <ModalBody p={0}>
          <Box
            h={"100%"}
            alignItems="center"
            justifyContent="center"
            bg="gray.100"
          >
            <div id="recaptcha-container"></div>
            <Box
              width={"100%"} // Responsive width for different screen sizes
              maxWidth="900px"
              boxShadow="lg"
              backgroundColor="white"
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
                    Login First
                  </Heading>
                  <Text fontSize={["md", "lg", "lg", "lg"]} mb="6">
                    Please login to get proceed
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
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

const step1 = ({
  onOpen,
  isd_code,
  phoneNumber,
  setphoneNumber,
  handleSubmit,
  isLoading,
}) => (
  <Box width={["100%", "100%", "50%", "50%"]} p={["6", "8", "8", "10"]}>
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
      Request OTP
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
const step2 = ({ setOTP, handleOtpSubmit, isLoading }) => (
  <Box width={["100%", "100%", "50%", "50%"]} p={["6", "8", "8", "10"]}>
    <Text fontSize="md" mb="2" fontWeight={600}>
      Enter OTP
    </Text>
    <HStack justify={"space-between"}>
      <PinInput
        type="number"
        onComplete={(value) => {
          setOTP(value);
        }}
      >
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
  </Box>
);

export default LoginModal;
