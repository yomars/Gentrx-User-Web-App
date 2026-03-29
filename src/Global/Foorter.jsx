/* eslint-disable react/prop-types */
import {
  Box,
  Container,
  SimpleGrid,
  Stack,
  Text,
  Flex,
  Image,
  Link,
  Divider,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import useSettingsData from "../Hooks/SettingData";
import imageBaseURL from "../Controllers/image";

const Logo = (props) => {
  const { settingsData } = useSettingsData();
  const logo = settingsData?.find((value) => value.id_name === "logo");
  const logoSrc = logo?.value ? `${imageBaseURL}/${logo.value}` : "/favicon.png";
  return (
    <Box
      bg="rgba(255,255,255,0.94)"
      borderRadius="xl"
      px={3}
      py={2.5}
      boxShadow="0 14px 30px rgba(0, 22, 84, 0.32), 0 3px 10px rgba(0, 22, 84, 0.2)"
    >
      <Image
        w={40}
        src={logoSrc}
        alt="Logo"
        objectFit="contain"
        filter="brightness(1.04) saturate(1.22) contrast(1.18) drop-shadow(0 4px 10px rgba(0, 22, 84, 0.25))"
        {...props}
      />
    </Box>
  );
};

const ListHeader = ({ children }) => (
  <Text fontWeight={500} fontSize={{ base: "12px", md: "16px" }} mb={1} color="#fff">
    {children}
  </Text>
);

export default function Footer() {
  const { settingsData } = useSettingsData();
  const play_store_link = settingsData?.find(
    (value) => value.id_name === "play_store_link"
  );
  const app_store_link = settingsData?.find(
    (value) => value.id_name === "app_store_link"
  );
  const title = settingsData?.find((value) => value.id_name === "clinic_name");
  const clinicName = title?.value || "GentRx";
  const playStoreHref = play_store_link?.value || "#";
  const appStoreHref = app_store_link?.value || "#";

  return (
    <Box bg="#1f48dd" color="#fff">
      <Container as={Stack} maxW="6xl" py={4}>
        <SimpleGrid
          templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
          spacing={3}
          mt={2}
        >
          <Stack align="flex-start">
            <Logo />
            <Box as={RouterLink} to="/about-us" color="#fff" fontSize={{ base: "11px", md: "14px" }}>
              About GentRX
            </Box>
          </Stack>

          <Stack align="flex-start">
            <ListHeader>Useful Links</ListHeader>
            <Box as={RouterLink} to="/login" color="#fff" fontSize={{ base: "11px", md: "14px" }}>
              Login as a Patient
            </Box>
            <Box as={RouterLink} to="/login" color="#fff" fontSize={{ base: "11px", md: "14px" }}>
              Login as a Nurse
            </Box>
            <Box as={Link} href="https://www.gentrx.ph/admin/" isExternal color="#fff" fontSize={{ base: "11px", md: "14px" }}>
              Login as a Doctor
            </Box>
          </Stack>

          <Stack align="flex-start">
            <ListHeader>Legal and Privacy</ListHeader>
            <Box as={RouterLink} to="/terms-and-conditions" color="#fff" fontSize={{ base: "11px", md: "14px" }}>
              Terms and Conditions
            </Box>
            <Box as={RouterLink} to="/data-retention-policy" color="#fff" fontSize={{ base: "11px", md: "14px" }}>
              Data Retention Policy
            </Box>
            <Box as={RouterLink} to="/cookie-policy" color="#fff" fontSize={{ base: "11px", md: "14px" }}>
              Cookie Policy
            </Box>
            <Box as={RouterLink} to="/privacy-policy" color="#fff" fontSize={{ base: "11px", md: "14px" }}>
              Privacy Policy
            </Box>
          </Stack>
        </SimpleGrid>

        <Divider borderColor="rgba(255,255,255,0.5)" my={4} />

        <Stack spacing={2}>
          <Text fontSize={{ base: "12px", md: "18px" }} fontWeight={600}>
            Download our app and register now
          </Text>
          <Flex gap={5} justifyContent="start" w="100%" wrap="wrap">
            <Link isExternal href={playStoreHref}>
              <Image src="/play store.png" w={180} />
            </Link>
            <Link isExternal href={appStoreHref}>
              <Image src="/app store.png" w={180} />
            </Link>
          </Flex>
          <Text fontSize={{ base: "11px", md: "14px" }} pt={2}>
            © 2025. {clinicName}. Philippines. All Rights Reserved.
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
