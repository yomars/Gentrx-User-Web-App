import { Box, Flex, Image, Text, Heading, Grid, GridItem, Link } from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import user from "../Controllers/user";
import useSettingsData from "../Hooks/SettingData";

function MobileAppSection() {
  const navigate = useNavigate();
  const { settingsData } = useSettingsData();
  const play_store_link = settingsData?.find(
    (value) => value.id_name === "play_store_link"
  );
  const app_store_link = settingsData?.find(
    (value) => value.id_name === "app_store_link"
  );

  const protectedRoutes = ["/appointments", "/laboratory-requests", "/prescriptions", "/profile", "/wallet"];

  const handleItemClick = (e, link) => {
    if (!link) {
      e.preventDefault();
      return;
    }
    if (protectedRoutes.includes(link) && !user) {
      e.preventDefault();
      navigate("/login");
    }
  };

  return (
    <Box position={"relative"}>
      <Flex
        gap={0}
        alignItems={"flex-start"}
        flexDir={{ base: "column", md: "row" }}
        position={"relative"}
      >
        {/* Left side content */}
        <Box flex={1} mr={{ base: 0, md: "-80px" }} position={"relative"}>
          {/* Heading and store badges */}
          <Box mb={{ base: 6, md: 10 }} pr={{ base: 0, md: "100px" }} pt={{ base: 0, md: 8 }}>
            <Heading color={"primary.text"} as={"h1"} fontSize={{ base: "28px", md: "34px" }} mb={4}>
              Reliable Care You Can Count On Whenever You Need Medical
              Support
            </Heading>
            <Text mb={5}>
              Download the Gentrx app and book your doctor in minutes.
            </Text>
            <Flex gap={5}>
              <Link isExternal href={play_store_link?.value}>
                <Image src="/google-play-icon.svg" h="54px" w="180px" objectFit="contain" />
              </Link>
              <Link isExternal href={app_store_link?.value}>
                <Image src="/apple-store-icon.svg" h="55px" w="187px" objectFit="contain" />
              </Link>
            </Flex>
          </Box>

          {/* Green feature grid box */}
          <Box
            bg={"#64B981"}
            borderRadius={"15px"}
            p={{ base: 6, md: 10 }}
            pr={{ base: 6, md: "100px" }}
            position={"relative"}
            zIndex={1}
            mr={{ base: 0, md: "20px" }}
          >
            <Heading color={"white"} size={"lg"} mb={6}>
              Choose your specialist, set your schedule, and confirm your
              visit with ease.
            </Heading>
            <Grid
              templateColumns={{
                base: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              }}
              gap={4}
            >
              {[
                { name: "Appointment", icon: "/icons/mobile-features/appointment.svg", link: "/appointments" },
                { name: "Lab Test", icon: "/icons/mobile-features/lab-test.svg", link: "/laboratory-requests" },
                { name: "Check-up", icon: "/icons/mobile-features/checkup.svg", link: "/appointments" },
                { name: "Doctors", icon: "/icons/mobile-features/doctors.svg", link: "/doctors" },
                { name: "Prescription", icon: "/icons/mobile-features/prescription.svg", link: "/prescriptions" },
                { name: "Patient Profile", icon: "/icons/mobile-features/patient-profile.svg", link: "/profile" },
                { name: "Hospital Info", icon: "/icons/mobile-features/hospital-info.svg", link: "/clinics" },
              ].map((item, index) => (
                <GridItem
                  key={index}
                  as={item.link ? RouterLink : "div"}
                  to={item.link || undefined}
                  onClick={(e) => handleItemClick(e, item.link)}
                  p={4}
                  bg={"#D9D9D980"}
                  borderRadius={"15px"}
                  textAlign={"center"}
                  display={"flex"}
                  flexDirection={"column"}
                  alignItems={"center"}
                  gap={2}
                  cursor={"pointer"}
                  transition={"all 0.2s"}
                  _hover={{ bg: "#FFFFFF40", transform: "translateY(-2px)" }}
                  _active={{ transform: "translateY(0)" }}
                >
                  <Image
                    src={item.icon}
                    alt={item.name}
                    h={"35px"}
                    w={"35px"}
                    filter={"brightness(0) invert(1)"}
                  />
                  <Text color="white" fontWeight={"bold"} fontSize={"14px"}>
                    {item.name}
                  </Text>
                </GridItem>
              ))}
            </Grid>
          </Box>
        </Box>

        {/* Mobile phone image */}
        <Box
          flex={{ base: "none", md: "0 0 404px" }}
          position={{ base: "relative", md: "relative" }}
          zIndex={2}
          mb={{ base: 5, md: 0 }}
          mr={{ base: 0, md: "50px" }}
        >
          <Image
            src="/mobile-promotion.png"
            h={{ base: "500px", md: "782px" }}
            w={{ base: "auto", md: "404px" }}
            objectFit="contain"
          />
        </Box>
      </Flex>
    </Box>
  );
}

export default MobileAppSection;
