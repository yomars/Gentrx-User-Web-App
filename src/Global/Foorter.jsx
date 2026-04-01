import {
  Box,
  Container,
  Divider,
  Flex,
  Grid,
  GridItem,
  Icon,
  Image,
  Input,
  Link,
  Text,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok } from "react-icons/fa";
import { FaCirclePlay } from "react-icons/fa6";
import useSettingsData from "../Hooks/SettingData";

const linkColumns = [
  {
    title: "About us",
    items: [
      { label: "About GentRX", href: "#" },
      { label: "Mission and Vision", href: "#" },
      { label: "Core Values", href: "#" },
      { label: "Organization", href: "#" },
      { label: "Partners", href: "#" },
    ],
  },
  {
    title: "Useful Links",
    items: [
      { label: "Registration", href: "#" },
      { label: "Patient Guide", href: "#" },
      { label: "Become a GentRx Partners", href: "#" },
      { label: "Login as a Doctor", href: "#" },
      { label: "Login as a Patient", href: "#" },
      { label: "Login as a Nurse", href: "#" },
    ],
  },
  {
    title: "Latest News",
    items: [
      { label: "News and Health Articles", href: "#" },
      { label: "News Network", href: "#" },
      { label: "RSS Feeds", href: "#" },
    ],
  },
  {
    title: "Legal and Privacy",
    items: [
      { label: "Terms and Conditions", href: "#" },
      { label: "User Privacy", href: "#" },
      { label: "Cookie Privacy", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Other Disclosures", href: "#" },
      { label: "Sitemap", href: "/sitemap" },
    ],
  },
];

const socialLinks = [
  { icon: FaFacebookF, href: "#", label: "Facebook" },
  { icon: FaInstagram, href: "#", label: "Instagram" },
  { icon: FaTiktok, href: "#", label: "TikTok" },
  { icon: FaLinkedinIn, href: "#", label: "LinkedIn" },
  { icon: FaCirclePlay, href: "#", label: "YouTube" },
];

export default function Footer() {
  const { settingsData } = useSettingsData();
  const playStoreLink = settingsData?.find((value) => value.id_name === "play_store_link");
  const appStoreLink = settingsData?.find((value) => value.id_name === "app_store_link");
  const title = settingsData?.find((value) => value.id_name === "clinic_name");

  const clinicName = title?.value || "GentRx";
  const playStoreHref = playStoreLink?.value || "#";
  const appStoreHref = appStoreLink?.value || "#";

  return (
    <Box bg="#1f48dd" color="white">
      <Container maxW="7xl" py={{ base: 10, md: 12 }}>
        <Flex
          direction={{ base: "column", lg: "row" }}
          justify="space-between"
          align={{ base: "flex-start", lg: "center" }}
          gap={{ base: 5, lg: 8 }}
        >
          <Box maxW={{ base: "100%", lg: "520px" }}>
            <Text fontSize={{ base: "2xl", md: "4xl" }} fontWeight={700} lineHeight={1.15}>
              Get Our News And Updates
            </Text>
            <Text mt={3} color="rgba(255,255,255,0.84)" fontSize={{ base: "sm", md: "xl" }}>
              Receive health tips, service updates, and important announcements straight to your email.
            </Text>
          </Box>

          <Flex
            bg="white"
            borderRadius="999px"
            w={{ base: "100%", lg: "560px" }}
            p={1}
            align="center"
          >
            <Input
              placeholder="Enter your email"
              border="none"
              _focusVisible={{ boxShadow: "none" }}
              color="#222"
              fontSize={{ base: "sm", md: "lg" }}
              _placeholder={{ color: "#a0a0a0" }}
            />
            <Box
              as="button"
              px={{ base: 5, md: 8 }}
              h={{ base: "40px", md: "52px" }}
              bg="#1f48dd"
              borderRadius="999px"
              fontWeight={600}
              fontSize={{ base: "sm", md: "xl" }}
              whiteSpace="nowrap"
            >
              Subscribe
            </Box>
          </Flex>
        </Flex>

        <Divider borderColor="rgba(255,255,255,0.35)" my={{ base: 8, md: 10 }} />

        <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={{ base: 8, lg: 10 }}>
          {linkColumns.map((column) => (
            <GridItem key={column.title}>
              <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight={700} mb={3}>
                {column.title}
              </Text>
              <Flex direction="column" gap={2}>
                {column.items.map((item, itemIndex) => (
                  <Link
                    key={`${column.title}-${item.label}-${itemIndex}`}
                    as={item.href.startsWith("/") ? RouterLink : "a"}
                    href={item.href.startsWith("/") ? undefined : item.href}
                    to={item.href.startsWith("/") ? item.href : undefined}
                    fontSize={{ base: "md", md: "xl" }}
                    color="rgba(255,255,255,0.88)"
                    _hover={{ color: "white", textDecoration: "underline" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </Flex>
            </GridItem>
          ))}
        </Grid>

        <Box mt={{ base: 12, md: 20 }}>
          <Text fontSize={{ base: "xl", md: "3xl" }} fontWeight={700}>
            Download our app and register now
          </Text>
          <Flex gap={4} mt={4} wrap="wrap">
            <Link href={playStoreHref} isExternal>
              <Image src="/play store.png" fallbackSrc="/google-play-icon.svg" w={{ base: "170px", md: "210px" }} />
            </Link>
            <Link href={appStoreHref} isExternal>
              <Image src="/app store.png" fallbackSrc="/apple-store-icon.svg" w={{ base: "170px", md: "210px" }} />
            </Link>
          </Flex>
        </Box>

        <Divider borderColor="rgba(255,255,255,0.35)" my={{ base: 8, md: 10 }} />

        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          gap={4}
        >
          <Text fontSize={{ base: "sm", md: "xl" }} color="rgba(255,255,255,0.88)">
            © 2025. {clinicName}. Philippines. All Rights Reserved.
          </Text>

          <Flex gap={3}>
            {socialLinks.map((socialLink) => (
              <Flex
                key={socialLink.label}
                as="a"
                href={socialLink.href}
                aria-label={socialLink.label}
                w={{ base: "34px", md: "42px" }}
                h={{ base: "34px", md: "42px" }}
                borderRadius="full"
                bg="white"
                color="#1f48dd"
                align="center"
                justify="center"
                _hover={{ transform: "translateY(-1px)", boxShadow: "md" }}
                transition="all 0.2s ease"
              >
                <Icon as={socialLink.icon} boxSize={{ base: "18px", md: "22px" }} />
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
