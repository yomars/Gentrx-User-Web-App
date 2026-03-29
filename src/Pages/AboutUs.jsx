import { FaCalendarAlt, FaHospitalAlt, FaUserMd } from "react-icons/fa";
import { MdBiotech, MdHealthAndSafety } from "react-icons/md";
import { BsPrescription } from "react-icons/bs";
import { HiUserCircle } from "react-icons/hi";
import { IoMdWallet } from "react-icons/io";
import { Box, Flex, Grid, GridItem, Heading, Image, SimpleGrid, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import useSettingsData from "../Hooks/SettingData";
import Webpage from "./WebPages/Webpage";

export default function AboutUs() {
  const { settingsData } = useSettingsData();

  const playStoreLink = settingsData?.find((value) => value.id_name === "play_store_link");
  const appStoreLink = settingsData?.find((value) => value.id_name === "app_store_link");

  const playStoreHref = playStoreLink?.value || "#";
  const appStoreHref = appStoreLink?.value || "#";

  const quickAccessItems = [
    {
      label: "Appointment",
      icon: <FaCalendarAlt fontSize={26} />,
      to: "/doctors",
    },
    {
      label: "Lab Test",
      icon: <MdBiotech fontSize={28} />,
      to: "/lab-tests",
    },
    {
      label: "Check-up",
      icon: <MdHealthAndSafety fontSize={28} />,
      to: "/doctors",
    },
    {
      label: "Doctors",
      icon: <FaUserMd fontSize={26} />,
      to: "/doctors",
    },
    {
      label: "Prescription",
      icon: <BsPrescription fontSize={26} />,
      to: "/login",
    },
    {
      label: "Patient Profile",
      icon: <HiUserCircle fontSize={30} />,
      to: "/login",
    },
    {
      label: "Hospital Info",
      icon: <FaHospitalAlt fontSize={26} />,
      to: "/clinics",
    },
    {
      label: "Top-up",
      icon: <IoMdWallet fontSize={26} />,
      to: "/login",
    },
  ];

  return (
    <Box>
      {/* ── Hero Section ── */}
      <Box position="relative" overflow="hidden" bg="#f0faf7">
        <Image
          src="/images/about-us/main-hero.png"
          alt="Doctor at work"
          w="80%"
          maxH={{ base: "256px", md: "384px", lg: "448px" }}
          objectFit="cover"
          objectPosition="center"
          display="block"
          mx="auto"
        />

        {/* Green card – absolutely positioned over the right side of the hero */}
        <Box
          position="absolute"
          top="50%"
          right={{ base: "4%", md: "6%", lg: "8%" }}
          transform="translateY(-50%)"
          bg="#2dae8f"
          borderRadius="2xl"
          px={{ base: 5, md: 8, lg: 10 }}
          py={{ base: 5, md: 8, lg: 10 }}
          maxW={{ base: "42%", sm: "38%", md: "36%", lg: "32%" }}
          boxShadow="lg"
        >
          <Text
            color="white"
            fontWeight={700}
            fontSize={{ base: "sm", md: "xl", lg: "2xl" }}
            lineHeight={1.4}
            fontFamily="Quicksand, sans-serif"
          >
            Focused on Providing Reliable Care for Your Health Needs
          </Text>
        </Box>
      </Box>

      {/* ── Intro copy section ── */}
      <Box bg="white" py={{ base: 10, md: 14 }} px={{ base: 5, md: 10, lg: 20 }}>
        <Box maxW="860px" mx="auto" textAlign="center">
          <Text
            fontFamily="Quicksand, sans-serif"
            fontWeight={700}
            fontSize={{ base: "xl", md: "2xl", lg: "3xl" }}
            color="#2dae8f"
            mb={6}
          >
            Your Trusted Partner for Quality Medical Care
          </Text>

          <Text
            fontSize={{ base: "sm", md: "md" }}
            color="gray.700"
            mb={4}
            lineHeight={1.8}
          >
            GentRx gives you quick access to doctors and essential health
            services. You can find the right specialist, choose your preferred
            schedule, and manage your visit using the app.
          </Text>

          <Text
            fontSize={{ base: "sm", md: "md" }}
            color="gray.700"
            mb={4}
            lineHeight={1.8}
          >
            We aim to provide consistent and reliable care for every patient who
            trusts GentRx. Our values shape how we work, how we make decisions,
            and how we deliver each service.
          </Text>

          <Text
            fontSize={{ base: "sm", md: "md" }}
            color="gray.700"
            lineHeight={1.8}
          >
            These principles guide our staff, our processes, and the experience
            we want every patient to have. They help us maintain high standards,
            build trust, and ensure that every visit, appointment, or
            consultation meets your expectations.
          </Text>
        </Box>
      </Box>

      {/* ── Values cards ── */}
      <Box
        bg="#f0faf7"
        py={{ base: 6, md: 9 }}
        px={{ base: 4, md: 8, lg: 16 }}
        w={{ base: "100%", md: "80%" }}
        mx="auto"
      >
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} maxW="720px" mx="auto">
          {[
            {
              icon: "/images/about-us/icon-professionalism.svg",
              title: "Professionalism",
              desc: "Using updated medical tools",
            },
            {
              icon: "/images/about-us/icon-integrity.svg",
              title: "Integrity",
              desc: "Clear processes and trusted standards",
            },
            {
              icon: "/images/about-us/icon-loyalty.svg",
              title: "Loyalty",
              desc: "Steady support for every patient",
            },
          ].map(({ icon, title, desc }) => (
            <Box
              key={title}
              bg="white"
              borderRadius="xl"
              p={{ base: 5, md: 6 }}
              textAlign="center"
              boxShadow="sm"
            >
              <Image
                src={icon}
                alt={title}
                w={{ base: "60px", md: "68px" }}
                h={{ base: "60px", md: "68px" }}
                mx="auto"
                mb={3}
              />
              <Text
                fontFamily="Quicksand, sans-serif"
                fontWeight={700}
                fontSize={{ base: "xl", md: "2xl" }}
                color="#2dae8f"
                whiteSpace="nowrap"
                mb={2}
              >
                {title}
              </Text>
              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" lineHeight={1.7}>
                {desc}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      <Box bg="white" py={{ base: 12, md: 16 }} px={{ base: 5, md: 8, lg: 12 }}>
        <Box maxW="1180px" mx="auto" position="relative">
          <Box maxW={{ base: "100%", lg: "100%" }} pr={{ base: 0, lg: "72px" }}>
            <Box maxW={{ base: "100%", lg: "46%" }}>
              <Heading
                color="#2dae8f"
                fontFamily="Quicksand, sans-serif"
                fontWeight={700}
                fontSize={{ base: "2xl", md: "4xl" }}
                lineHeight={1.2}
              >
                Reliable Care You Can Count On Whenever You Need Medical Support
              </Heading>

              <Text
                fontSize={{ base: "md", md: "lg" }}
                mt={4}
                color="gray.600"
                fontWeight={500}
              >
                Download the GentRx app and book your doctor in minutes.
              </Text>

              <Flex gap={4} mt={5} wrap="wrap">
                <a href={playStoreHref} target="_blank" rel="noopener noreferrer">
                  <Image src="/play store.png" fallbackSrc="/google-play-icon.svg" w={{ base: 140, md: 180 }} />
                </a>
                <a href={appStoreHref} target="_blank" rel="noopener noreferrer">
                  <Image src="/app store.png" fallbackSrc="/apple-store-icon.svg" w={{ base: 140, md: 180 }} />
                </a>
              </Flex>
            </Box>

            <Box
              bg="#6bc483"
              borderRadius="24px"
              p={{ base: 6, md: 8, lg: 10 }}
              pr={{ base: 6, lg: "38%" }}
              mt={{ base: 8, lg: 10 }}
              position="relative"
              zIndex={1}
            >
              <Heading
                color="white"
                fontFamily="Quicksand, sans-serif"
                fontWeight={700}
                fontSize={{ base: "xl", md: "2xl" }}
                lineHeight={1.25}
                maxW="640px"
              >
                Choose your specialist, set your schedule, and confirm your visit with ease.
              </Heading>

              <Grid
                templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
                gap={4}
                mt={8}
              >
                {quickAccessItems.map((item) => (
                  <GridItem
                    key={item.label}
                    as={RouterLink}
                    to={item.to}
                    bg="#9ad8ad"
                    borderRadius="16px"
                    p={{ base: 4, md: 5 }}
                    textAlign="center"
                    color="white"
                    transition="transform 0.2s ease, box-shadow 0.2s ease"
                    _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                  >
                    <Flex align="center" justify="center" mb={3}>
                      {item.icon}
                    </Flex>
                    <Text fontWeight={600} fontSize={{ base: "sm", md: "md" }}>
                      {item.label}
                    </Text>
                  </GridItem>
                ))}
              </Grid>
            </Box>
          </Box>

          <Flex
            justify={{ base: "center", lg: "flex-end" }}
            w={{ base: "100%", lg: "390px" }}
            position={{ base: "relative", lg: "absolute" }}
            bottom={{ base: "auto", lg: "0" }}
            right={{ base: "auto", lg: "72px" }}
            mt={{ base: 8, lg: 0 }}
            zIndex={2}
          >
              <Image
                src="/images/about-us/mobile-app.png"
                alt="GentRx mobile app"
                w={{ base: "280px", sm: "320px", md: "360px", lg: "390px" }}
                objectFit="contain"
                display="block"
              />
          </Flex>
        </Box>
      </Box>

      {/* ── Rest of About Us content from CMS ── */}
      <Webpage id={1} showTitle={false} />
    </Box>
  );
}
