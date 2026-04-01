import { FaCalendarAlt, FaHospitalAlt, FaUserMd } from "react-icons/fa";
import { MdBiotech, MdHealthAndSafety } from "react-icons/md";
import { Box, Button, Flex, Grid, GridItem, Heading, Image, Text } from "@chakra-ui/react";
import Departments from "../Components/Departments";
import useSettingsData from "../Hooks/SettingData";
import { BsPrescription } from "react-icons/bs";
import { HiUserCircle } from "react-icons/hi";
import { IoMdWallet } from "react-icons/io";
import Testimonials from "../Components/Testimonials";
import DoctorsSection from "../Components/DoctorsSection";
import { Link as RouterLink } from "react-router-dom";

export default function HomePage() {
  const { settingsData } = useSettingsData();

  const name = settingsData?.find((value) => value.id_name === "clinic_name");
  const playStoreLink = settingsData?.find(
    (value) => value.id_name === "play_store_link"
  );
  const appStoreLink = settingsData?.find(
    (value) => value.id_name === "app_store_link"
  );
  const appGalleryLink = settingsData?.find(
    (value) => value.id_name === "app_gallery_link"
  );

  const clinicName = name?.value || "GentRx";
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

  return (
    <Box>
      <Box bg="#f3f3f3" maxW="100vw">
        <div className="container">
          <Flex
            gap={10}
            pt={{ base: 10, md: 16 }}
            align="center"
            maxW="100%"
            flexDir={{ base: "column", md: "row" }}
          >
            <Box pb={8} flex={1} maxW="100%">
              <Heading
                color="#34C38F"
                as="h1"
                fontSize={{ base: "44px", md: "56px", lg: "64px" }}
                fontWeight={600}
                lineHeight={1.05}
                letterSpacing="-0.02em"
              >
                Best Health Care at Your Fingertips
              </Heading>
              <Text
                fontSize={{ base: "18px", md: "18px" }}
                color="#2f3848"
                mt={5}
                fontWeight={500}
                lineHeight={1.5}
                maxW="820px"
              >
                {clinicName} connects you to licensed doctors in minutes. You can book a
                visit, choose your specialist, and manage your records in one app. Download
                the app and start booking today.
              </Text>

              <Flex gap={4} mt={5} wrap="wrap">
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

              <Flex gap={4} mt={6} wrap="wrap">
                <Button
                  as={RouterLink}
                  to="/doctors"
                  bg="#1f48dd"
                  color="#fff"
                  px={8}
                  h="52px"
                  borderRadius="999px"
                  _hover={{ bg: "#173bb8" }}
                >
                  Book Appointment
                </Button>
                <Button
                  variant="outline"
                  borderColor="#1f48dd"
                  color="#1f48dd"
                  px={8}
                  h="52px"
                  borderRadius="999px"
                  onClick={() => {
                    const section = document.querySelector("#started");
                    section?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Explore Departments
                </Button>
              </Flex>
            </Box>
            <Image src="/both-doctors.png" fallbackSrc="/doctor-2.png" w={{ base: "90%", md: "48%" }} flex={1} />
          </Flex>

          <Grid
            templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
            gap={0}
            mt={6}
            pb={8}
            bg="#fff"
            borderRadius="16px"
            border="1px solid #e8e8e8"
            overflow="hidden"
          >
            {[
              { value: "35+", label: "Years of Experience" },
              { value: "30+", label: "Years of Experience" },
              { value: "100+", label: "Years of Experience" },
              { value: "500+", label: "Years of Experience" },
            ].map((stat) => (
              <GridItem
                key={stat.value}
                textAlign="left"
                px={{ base: 4, md: 8 }}
                py={{ base: 3, md: 4 }}
                borderRight={{ base: "0", md: "1px solid #e8e8e8" }}
                _last={{ borderRight: "0" }}
              >
                <Heading fontSize={{ base: "28px", md: "38px" }} color="#34C38F" lineHeight={1}>
                  {stat.value}
                </Heading>
                <Text fontSize={{ base: "13px", md: "12px" }} color="#2f3848" mt={1}>
                  {stat.label}
                </Text>
              </GridItem>
            ))}
          </Grid>
        </div>
      </Box>

      <Box id="started" bg="#f3f3f3">
        <Box pb={16} pt={8}>
          <Departments />
        </Box>
      </Box>

      <Box pt={6} bg="#f3f3f3">
        <div className="container">
          <Flex gap={8} pt={6} flexDir={{ base: "column", md: "row" }}>
            <Flex flex={1} justify={{ base: "center", md: "left" }}>
              <Image src="/mobile-promotion.png" fallbackSrc="/doctor-2.png" w={{ base: 360, md: 460 }} objectFit="contain" />
            </Flex>
            <Box flex={1} pb={10}>
              <Text
                fontSize={{ base: "34px", md: "50px" }}
                fontWeight={600}
                mt={0}
                color="#34C38F"
                lineHeight={1.15}
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
        </div>
      </Box>

      <Box bg="#f3f3f3" py={14}>
        <div className="container">
          <Heading color="#34C38F" fontWeight={600} textAlign="center" fontSize={{ base: "34px", md: "58px" }}>
            Simple and Secure Payment Options
          </Heading>
          <Text
            fontSize={{ base: "20px", md: "18px" }}
            textAlign="center"
            mt={2}
            color="#2f3848"
            fontWeight={500}
          >
            Pay using trusted platforms available nationwide. Choose the method that fits your needs.
          </Text>
          <Flex
            mt={8}
            gap={{ base: 4, md: 6 }}
            justify="center"
            align="center"
            wrap="wrap"
            rowGap={{ base: 4, md: 5 }}
          >
            <Image
              src="/icons/payment-methods/gcash.svg"
              h={{ base: "36px", md: "50px" }}
              maxW={{ base: "100px", md: "150px" }}
              w="auto"
              objectFit="contain"
            />
            <Image
              src="/icons/payment-methods/paymaya-combined.svg"
              h={{ base: "36px", md: "50px" }}
              maxW={{ base: "110px", md: "170px" }}
              w="auto"
              objectFit="contain"
            />
            <Image
              src="/icons/payment-methods/dragonpay.png"
              h={{ base: "36px", md: "50px" }}
              maxW={{ base: "105px", md: "160px" }}
              w="auto"
              objectFit="contain"
            />
            <Image
              src="/icons/payment-methods/visa.svg"
              h={{ base: "36px", md: "50px" }}
              maxW={{ base: "95px", md: "140px" }}
              w="auto"
              objectFit="contain"
            />
            <Image
              src="/icons/payment-methods/mastercard.svg"
              h={{ base: "36px", md: "50px" }}
              maxW={{ base: "95px", md: "140px" }}
              w="auto"
              objectFit="contain"
            />
          </Flex>
        </div>
      </Box>

      <Box mt={4} bg="#f3f3f3" pt={5} pb={14}>
        <div className="container">
          <Flex p={0} align="flex-start" flexDir={{ base: "column", md: "row" }} gap={{ base: 8, md: 12 }}>
            {/* Left Side: Heading, Description, Steps Grid */}
            <Box flex={1}>
              <Heading
                color="#34C38F"
                fontSize={{ base: "34px", md: "48px" }}
                lineHeight={1.1}
                mb={4}
              >
                Your Step by Step Guide to Booking a Visit and Completing Your Treatment
              </Heading>
              <Text fontSize={{ base: "18px", md: "18px" }} fontWeight={500} color="#2f3848" mb={8}>
                Follow these steps to set your appointment and complete your visit with ease.
              </Text>
              {/* Steps Grid 2x2 */}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={{ base: 5, md: 6 }} mb={8}>
                <Box bg="#f0f7f4" p={{ base: 5, md: 6 }} borderRadius="12px">
                  <Heading color="#34C38F" fontSize={{ base: "32px", md: "40px" }} mb={2}>
                    1.
                  </Heading>
                  <Text fontSize={{ base: "16px", md: "18px" }} color="#2f3848" fontWeight={500}>
                    Book an Appointment
                  </Text>
                </Box>
                <Box bg="#f0f7f4" p={{ base: 5, md: 6 }} borderRadius="12px">
                  <Heading color="#34C38F" fontSize={{ base: "32px", md: "40px" }} mb={2}>
                    2.
                  </Heading>
                  <Text fontSize={{ base: "16px", md: "18px" }} color="#2f3848" fontWeight={500}>
                    Conduct Checkup
                  </Text>
                </Box>
                <Box bg="#f0f7f4" p={{ base: 5, md: 6 }} borderRadius="12px">
                  <Heading color="#34C38F" fontSize={{ base: "32px", md: "40px" }} mb={2}>
                    3.
                  </Heading>
                  <Text fontSize={{ base: "16px", md: "18px" }} color="#2f3848" fontWeight={500}>
                    Perform Treatment
                  </Text>
                </Box>
                <Box bg="#f0f7f4" p={{ base: 5, md: 6 }} borderRadius="12px">
                  <Heading color="#34C38F" fontSize={{ base: "32px", md: "40px" }} mb={2}>
                    4.
                  </Heading>
                  <Text fontSize={{ base: "16px", md: "18px" }} color="#2f3848" fontWeight={500}>
                    Prescribe and Payment
                  </Text>
                </Box>
              </Grid>
              {/* CTA Button */}
              <Button
                bg="#005FCC"
                color="white"
                fontWeight={600}
                fontSize={{ base: "16px", md: "18px" }}
                py={{ base: 6, md: 7 }}
                px={{ base: 8, md: 10 }}
                borderRadius="24px"
                _hover={{ bg: "#0047A3" }}
              >
                Book an Appointment
              </Button>
            </Box>
            {/* Right Side: Doctor Image */}
            <Box flex={1} display="flex" justifyContent="center" alignItems="flex-start">
              <Image
                src="/yourstepbystepheronew.png"
                fallbackSrc="/doctor-2.png"
                w={{ base: "100%", md: "100%" }}
                maxH={{ base: "420px", md: "600px" }}
                objectFit="contain"
                borderRadius="16px"
              />
            </Box>
          </Flex>
        </div>
      </Box>

      <Box mt={8} bg="#fff" pt={5} pb={8}>
        <div className="container">
          <Flex
            align="center"
            gap={8}
            flexDir={{ base: "column", md: "row" }}
            bg="#6bc483"
            p={{ base: 6, md: 10 }}
          >
            <Box flex={1}>
              <Heading color="#fff" fontSize={{ base: "36px", md: "56px" }} lineHeight={1.1}>
                Quality Medical Care You Can Access Anytime
              </Heading>
              <Text fontSize={{ base: "20px", md: "18px" }} mt={4} color="#fff" maxW="95%">
                Get the services you need in one place. Book your doctor, view available departments,
                and manage your visit with ease.
              </Text>
            </Box>
            <Flex flex={1} justify={{ base: "center", md: "flex-end" }}>
              <Image src="/images/quality-care.png" fallbackSrc="/doctor-2.png" maxW={{ base: "90%", md: "420px" }} objectFit="contain" />
            </Flex>
          </Flex>
        </div>
      </Box>

      <Box bg="#f3f3f3" py={12}>
        <div className="container">
          <DoctorsSection />
        </div>
      </Box>

      <Box bg="#fff" py={12}>
        <Testimonials />
      </Box>
    </Box>
  );
}
