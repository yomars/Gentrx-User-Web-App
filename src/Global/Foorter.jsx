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
import React from "react";
import useSettingsData from "../Hooks/SettingData";
import imageBaseURL from "../Controllers/image";

const Logo = ({ settingsData: externalSettingsData, ...props }) => {
  const { settingsData: queriedSettingsData } = useSettingsData();
  const settingsData =
    Array.isArray(externalSettingsData) && externalSettingsData.length
      ? externalSettingsData
      : queriedSettingsData;
  const [logoError, setLogoError] = React.useState(false);

  const logo = settingsData?.find((value) => value.id_name === "logo");
  const baseLogoSrc = logo?.value ? `${imageBaseURL}/${logo.value}` : null;
  const logoSrc = logoError ? "/favicon.png" : baseLogoSrc;

  if (!logoSrc) {
    return null;
  }

  return (
    <Image
      w={32}
      src={logoSrc}
      alt="Logo"
      filter="drop-shadow(0 0 12px rgba(255,255,255,0.8))"
      border="2px solid rgba(255,255,255,0.8)"
      borderRadius="md"
      p={1}
      onError={(e) => {
        console.error("[Footer] Logo image failed to load:", {
          attemptedSrc: baseLogoSrc || "none",
          currentSrc: logoSrc,
          error: e?.type || e?.message || "Unknown error",
          usingFallback: logoError || !baseLogoSrc ? true : false,
        });
        if (!logoError && baseLogoSrc) {
          setLogoError(true);
        }
      }}
      onLoad={() => {
        if (logoError) setLogoError(false);
      }}
      {...props}
    />
  );
};

const ListHeader = ({ children }) => (
  <Text fontWeight={500} fontSize={{ base: "12px", md: "16px" }} mb={1} color="#fff">
    {children}
  </Text>
);

export default function Footer({ settingsData: externalSettingsData }) {
  const { settingsData: queriedSettingsData } = useSettingsData();
  const settingsData =
    Array.isArray(externalSettingsData) && externalSettingsData.length
      ? externalSettingsData
      : queriedSettingsData;
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
            <Logo settingsData={settingsData} />
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
