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
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import ISDCODEMODAL from "../Components/ISDCODEMODAL";
import showToast from "../Controllers/ShowToast";
import { Link as RouterLink } from "react-router-dom";
import defaultISD from "../Controllers/defaultISD";

function LoginModal({ isModalOpen, onModalClose }) {
  const [isd_code, setIsd_code] = useState(defaultISD);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [phoneNumber, setphoneNumber] = useState();
  const [isLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!phoneNumber) {
      showToast(toast, "error", "please enter phone number");
      return;
    }
    // OTP modal still targets legacy auth endpoints; route users to patient password login.
    showToast(
      toast,
      "info",
      "Continue in patient login page to sign in with your PIN/password"
    );
    setTimeout(() => {
      window.location.href = `/login?phone=${encodeURIComponent(phoneNumber)}`;
    }, 500);
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
                {step1({
                  onOpen,
                  isd_code,
                  phoneNumber,
                  setphoneNumber,
                  handleSubmit,
                  isLoading,
                })}
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

export default LoginModal;
