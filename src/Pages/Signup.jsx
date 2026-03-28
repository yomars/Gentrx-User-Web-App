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
import { ADD } from "../Controllers/ApiControllers";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useState } from "react";
import defaultISD from "../Controllers/defaultISD";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";

const Signup = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isd_code, setIsd_code] = useState(defaultISD);
  const toast = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    handleSubmit,
    register,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const password = watch("password");

  const checkMobileExists = async (number) => {
    // Ensure we have a valid phone number
    if (!number || number.trim() === "") {
      throw new Error("Phone number is required");
    }
    const res = await ADD("", "re_login_phone", { phone: number });
    if (res.response === 200) {
      return res.status;
    } else {
      throw new Error("Something went wrong");
    }
  };

  const onSubmit = async (values) => {
    const { f_name, l_name, phone, gender, email, password } = values;

    try {
      // Check if phone number already exists
      if ((await checkMobileExists(phone)) === true) {
        return toast({
          title: "Phone number already exists!",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
      }

      // Directly create user without OTP
      const data = {
        f_name,
        l_name,
        phone,
        isd_code,
        gender,
        email,
        password,
      };

      const res = await ADD("", "add_user", data);
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
      } else {
        showToast(toast, "error", res.message || "Signup failed");
      }
    } catch (error) {
      showToast(toast, "error", error.message);
    }
  };

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
              For questions or concerns related to data retention, you may contact: GentRx Data Protection Team info@gentrx.com.ph Santusan Street, Barangay Manggahan, General Trias, Cavite +63 995 514 8229
            </Text>

            <form onSubmit={handleSubmit(onSubmit)}>
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
                    placeholder="Mobile Number"
                    {...register("phone", {
                      required: "Phone number is required",
                      pattern: {
                        value: /^[0-9]{10}$/,
                        message: "Phone number must be 10 digits",
                      },
                    })}
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
              src="/public/images/login-hero.png"
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
