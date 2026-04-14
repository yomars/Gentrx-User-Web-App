/* eslint-disable react/prop-types */
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
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
import { FaCalendarAlt, FaHospitalAlt, FaUserMd } from "react-icons/fa";
import { MdBiotech, MdHealthAndSafety } from "react-icons/md";
import { BsPrescription } from "react-icons/bs";
import { HiUserCircle } from "react-icons/hi";
import { IoMdWallet } from "react-icons/io";
import ISDCODEMODAL from "../Components/ISDCODEMODAL";
import showToast from "../Controllers/ShowToast";
import { ADD } from "../Controllers/ApiControllers";
import {
  useNavigate,
  Link as RouterLink,
  useSearchParams,
} from "react-router-dom";
import defaultISD from "../Controllers/defaultISD";
import { setStorageItem } from "../lib/storage";
import useSettingsData from "../Hooks/SettingData";
import {
  ensurePatientAuthBackendReady,
  getAuthEndpoint,
} from "../Controllers/authConfig";

const FirebaseLogin = ({ redirectLocation }) => {
  const [isd_code, setIsd_code] = useState(defaultISD);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [phoneNumber, setphoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setisLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { settingsData } = useSettingsData();

  const playStoreLink = settingsData?.find(
    (value) => value.id_name === "play_store_link"
  );
  const appStoreLink = settingsData?.find(
    (value) => value.id_name === "app_store_link"
  );
  const appGalleryLink = settingsData?.find(
    (value) => value.id_name === "app_gallery_link"
  );

  const playStoreHref = playStoreLink?.value || "#";
  const appStoreHref = appStoreLink?.value || "#";
  const appGalleryHref = appGalleryLink?.value || "#";

  const quickAccessItems = [
    { label: "Appointment", icon: <FaCalendarAlt fontSize={26} />, to: "/doctors" },
    { label: "Lab Test", icon: <MdBiotech fontSize={28} />, to: "/lab-tests" },
    { label: "Check-up", icon: <MdHealthAndSafety fontSize={28} />, to: "/doctors" },
    { label: "Doctors", icon: <FaUserMd fontSize={26} />, to: "/doctors" },
    { label: "Prescription", icon: <BsPrescription fontSize={26} />, to: "/login" },
    { label: "Patient Profile", icon: <HiUserCircle fontSize={30} />, to: "/login" },
    { label: "Hospital Info", icon: <FaHospitalAlt fontSize={26} />, to: "/clinics" },
    { label: "Top-up", icon: <IoMdWallet fontSize={26} />, to: "/login" },
  ];

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
      await ensurePatientAuthBackendReady();

      let data = {
        phone: phoneNumber,
        password: password,
      };
      // Use configurable endpoint (patient/login or legacy login_phone)
      const endpoint = getAuthEndpoint('login');
      const res = await ADD("", endpoint, data);
      
      if (res.status === true) {
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
    <Box bg="#f3f3f3" py={{ base: 3, md: 5 }}>
      <Flex alignItems="center" justifyContent="center" px={{ base: 4, md: 6 }}>
      <Box
        width="100%"
        maxWidth="1320px"
        backgroundColor="#f3f3f3"
        borderRadius="xl"
        overflow="hidden"
      >
        <Flex direction={{ base: "column", lg: "row" }} gap={{ base: 5, lg: 9 }}>
          <Box
            width={{ base: "100%", lg: "44%" }}
            bg="#e5e7eb"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            borderRadius="xl"
            p={{ base: "3", md: "4" }}
            position="relative"
          >
            <Image
              src="/images/login-hero.png"
              alt="GentRx Login Hero"
              width="100%"
              maxH={{ base: "320px", md: "400px", lg: "480px" }}
              objectFit="cover"
              borderRadius="lg"
            />
            <Box
              position="absolute"
              bottom="24px"
              left="50%"
              transform="translateX(-50%)"
              bg="#6bc483"
              color="#fff"
              px={7}
              py={3}
              borderRadius="10px"
              textAlign="center"
              fontWeight={700}
              fontSize={{ base: "22px", md: "28px" }}
              lineHeight={1.1}
              w="82%"
            >
              We are ready to serve you
            </Box>
          </Box>

          <Box
            width={{ base: "100%", lg: "56%" }}
            p={{ base: "4", md: "6", lg: "8" }}
            display="flex"
            flexDirection="column"
            justifyContent="center"
          >
            <Heading
              fontSize={{ base: "34px", md: "38px", lg: "40px" }}
              color="#0b8f3f"
              mb={4}
              lineHeight={1.12}
              maxW={{ lg: "480px" }}
            >
              We are always ensure best medical treatment for your health
            </Heading>

            <Text color="#4a5568" fontSize={{ base: "13px", md: "15px" }} mb={5} lineHeight={1.5} maxW={{ lg: "520px" }}>
              For question of concerns related to data retention, you may contact:
              GenRx Data Protection Team info@gentrx.ph Santusan Street,
              Barangay Manggahan, General Trias, Cavite +63 995 514 8229
            </Text>

            <Box>
              <InputGroup size={"lg"} mb="4">
                <InputLeftAddon
                  cursor={"pointer"}
                  bg="#dbe2ed"
                  borderColor="#bec8d8"
                  color="#27364b"
                  h="52px"
                  px={4}
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
                  placeholder="Enter mobile number"
                  aria-label="Mobile number"
                  h="52px"
                  bg="#dbe2ed"
                  borderColor="#bec8d8"
                  color="#27364b"
                  _placeholder={{ color: "#5c6778" }}
                  onChange={(e) => {
                    setphoneNumber(e.target.value);
                  }}
                />
              </InputGroup>

              <InputGroup size={"lg"} mb="4">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your 4-digit PIN or password"
                  aria-label="PIN or password"
                  value={password}
                  h="52px"
                  bg="#dbe2ed"
                  borderColor="#bec8d8"
                  color="#27364b"
                  _placeholder={{ color: "#5c6778" }}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <InputRightElement h="52px">
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
                bg="#1f48dd"
                color="white"
                _hover={{ bg: "#173bb8" }}
                width="100%"
                h="52px"
                mb="4"
                borderRadius="999px"
                fontWeight={700}
                onClick={handlePasswordLogin}
                isLoading={isLoading}
              >
                Login
              </Button>

              <Text fontSize="sm" textAlign="center" mb="4" color="#4a5568">
                By continuing, you agree to our{" "}
                <Link color="#2b6cb0" as={RouterLink} to={"/terms"}>
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link color="#2b6cb0" as={RouterLink} to={"/privacy-and-policy"}>
                  Privacy Policy
                </Link>
              </Text>
              <Link
                color="#2b6cb0"
                textAlign="center"
                display="block"
                as={RouterLink}
                to={"/signup"}
                fontWeight={600}
              >
                Don&apos;t have an account? Sign Up
              </Link>
            </Box>
          </Box>
        </Flex>
      </Box>

      </Flex>

      <Box maxW="1320px" mx="auto" px={{ base: 4, md: 6 }} mt={{ base: 7, md: 9 }}>
        <Flex gap={8} pt={1} flexDir={{ base: "column", md: "row" }} align="flex-start">
          <Flex flex={1} justify={{ base: "center", md: "left" }}>
            <Image src="/mobile-promotion.png" fallbackSrc="/doctor-2.png" w={{ base: 360, md: 500 }} objectFit="contain" />
          </Flex>
          <Box flex={1} pb={10}>
            <Text
              fontSize={{ base: "40px", md: "58px" }}
              fontWeight={600}
              mt={0}
              color="#34C38F"
              lineHeight={1.14}
            >
              Reliable Care You Can Count On Whenever You Need Medical Support
            </Text>
            <Text fontSize={{ base: "20px", md: "17px" }} mt={3} color="#2f3848" fontWeight={500}>
              Download the GentRx app and book your doctor in minutes.
            </Text>

            <Flex gap={4} mt={4} wrap="wrap">
              <a href={playStoreHref} target="_blank" rel="noopener noreferrer">
                <Image src="/play store.png" fallbackSrc="/google-play-icon.svg" w={180} />
              </a>
              <a href={appStoreHref} target="_blank" rel="noopener noreferrer">
                <Image src="/app store.png" fallbackSrc="/apple-store-icon.svg" w={180} />
              </a>
              <a href={appGalleryHref} target="_blank" rel="noopener noreferrer">
                <Image src="/appgallery.png" fallbackSrc="/vite.svg" w={180} />
              </a>
            </Flex>

            <Box mt={8} bg="#6bc483" borderRadius="20px" p={8}>
              <Heading color="#fff" fontSize={{ base: "30px", md: "30px" }} lineHeight={1.2}>
                Choose your specialist, set your schedule, and confirm your visit with ease.
              </Heading>
              <Grid
                templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
                gap={5}
                mt={8}
              >
                {quickAccessItems.map((item) => (
                  <GridItem
                    key={item.label}
                    as={RouterLink}
                    to={item.to}
                    bg="#9ad8ad"
                    borderRadius="16px"
                    p={5}
                    textAlign="center"
                    color="#fff"
                    transition="transform 0.2s ease, box-shadow 0.2s ease"
                    _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                  >
                    <Flex align="center" justify="center" mb={3}>{item.icon}</Flex>
                    <Text fontWeight={600} fontSize={{ base: "14px", md: "16px" }}>{item.label}</Text>
                  </GridItem>
                ))}
              </Grid>
            </Box>
          </Box>
        </Flex>
      </Box>

      <ISDCODEMODAL
        isOpen={isOpen}
        onClose={onClose}
        setisd_code={setIsd_code}
      />
    </Box>
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
