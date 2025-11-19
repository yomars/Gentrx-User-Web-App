/* eslint-disable react/prop-types */
import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightElement,
  Link,
  Text,
  useDisclosure,
  useToast,
  IconButton,
} from "@chakra-ui/react";
import { useState } from "react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import ISDCODEMODAL from "../Components/ISDCODEMODAL";
import showToast from "../Controllers/ShowToast";
import { ADD } from "../Controllers/ApiControllers";
import {
  useNavigate,
  Link as RouterLink,
  useSearchParams,
} from "react-router-dom";
import defaultISD from "../Controllers/defaultISD";

const FirebaseLogin = ({ redirectLocation }) => {
  const [isd_code, setIsd_code] = useState(defaultISD);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [phoneNumber, setphoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setisLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  // Password login handler
  const handlePasswordLogin = async () => {
    if (!phoneNumber) {
      showToast(toast, "error", "Please enter phone number");
      return;
    }
    if (!password) {
      showToast(toast, "error", "Please enter password");
      return;
    }
    
    setisLoading(true);
    try {
      let data = {
        phone: phoneNumber,
        password: password,
      };
      const res = await ADD("", "login_phone", data);
      
      if (res.status === true) {
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
        showToast(toast, "error", res.message || "Invalid credentials");
      }
    } catch (error) {
      showToast(toast, "error", error.message);
    }
    setisLoading(false);
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
              Login
            </Heading>
            <Text fontSize={["md", "lg", "lg", "lg"]} mb="6">
              We provide the best and most affordable healthcare services.
            </Text>
            <Image
              src="/medical-report.png"
              alt="Login Illustration"
              boxSize={["100px", "120px", "150px", "150px"]}
              mb="4"
            />
          </Box>

          <Box width={["100%", "100%", "50%", "50%"]} p={["6", "8", "8"]}>
            <Text fontSize="md" mb="2" fontWeight={600}>
              Mobile number
            </Text>
            <InputGroup size={"md"} mb="4">
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
                value={phoneNumber}
                onChange={(e) => {
                  setphoneNumber(e.target.value);
                }}
              />
            </InputGroup>

            <Text fontSize="md" mb="2" fontWeight={600}>
              PIN
            </Text>
            <InputGroup size={"md"} mb="4">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your PIN"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <InputRightElement>
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                />
              </InputRightElement>
            </InputGroup>

            <Button
              colorScheme="orange"
              width="100%"
              mb="4"
              onClick={handlePasswordLogin}
              isLoading={isLoading}
            >
              Login
            </Button>

            {/* <Link
              color="blue.500"
              textAlign="center"
              display="block"
              mb="4"
              fontSize="sm"
              as={RouterLink}
              to={"/forgot-password"}
            >
              Forgot Password?
            </Link> */}

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
    </>
  );
};
export default Login;
