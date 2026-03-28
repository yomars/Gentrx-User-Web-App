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
import { useForm, Controller } from "react-hook-form";
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
    const { f_name, l_name, phone, gender, dob, email, password } = values;     

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
        dob,
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
      minH="50vh"
      alignItems="center"
      justifyContent="center"
      bg="gray.100"
      padding="4"
    >
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
              alt="Signup Illustration"
              boxSize={["100px", "120px", "150px", "150px"]}
              mb="4"
            />
          </Box>

          <Box width={["100%", "100%", "50%", "50%"]} p={["6", "8", "8", "10"]}>
            <form onSubmit={handleSubmit(onSubmit)}>
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

              {/* Password */}
              <FormControl isInvalid={errors.password} mb="4">
                <Text fontSize="md" mb="2" fontWeight={600}>
                  PIN
                </Text>
                <InputGroup size={"md"}>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your 6-digit PIN"
                    maxLength={6}
                    {...register("password", {
                      required: "PIN is required",
                      pattern: {
                        value: /^[0-9]{6}$/,
                        message: "PIN must be exactly 6 digits",
                      },
                    })}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, '');   
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}      
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide PIN" : "Show PIN"
                      }
                    />
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>{errors.password?.message}</FormErrorMessage> 
              </FormControl>

              {/* Confirm Password */}
              <FormControl isInvalid={errors.confirm_password} mb="4">
                <Text fontSize="md" mb="2" fontWeight={600}>
                  Confirm PIN
                </Text>
                <InputGroup size={"md"}>
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your 6-digit PIN"
                    maxLength={6}
                    {...register("confirm_password", {
                      required: "Please confirm your PIN",
                      pattern: {
                        value: /^[0-9]{6}$/,
                        message: "PIN must be exactly 6 digits",
                      },
                      validate: (value) =>
                        value === password || "PINs do not match",
                    })}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, '');   
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={
                        showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />    
                      }
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword ? "Hide PIN" : "Show PIN"
                      }
                    />
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>
                  {errors.confirm_password?.message}
                </FormErrorMessage>
              </FormControl>

              <Button
                colorScheme="orange"
                width="100%"
                mb="4"
                isLoading={isSubmitting}
                type="submit"
              >
                Sign Up
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
