import {
  Box,
  Container,
  Heading,
  Link,
  SimpleGrid,
  Text,
  VStack,
  HStack,
  Badge,
  Divider,
  Icon,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import {
  FaHome,
  FaFlask,
  FaInfoCircle,
  FaUser,
  FaFileContract,
} from "react-icons/fa";

const sitemapSections = [
  {
    title: "Main Navigation",
    icon: FaHome,
    links: [
      { label: "Home", path: "/", priority: "High" },
      { label: "Doctors", path: "/doctors", priority: "High" },
      { label: "Clinics", path: "/clinics", priority: "High" },
      { label: "Lab Tests", path: "/lab-tests", priority: "High" },
      { label: "Departments", path: "/doctors", priority: "Medium" },
    ],
  },
  {
    title: "User Account",
    icon: FaUser,
    links: [
      { label: "User Profile", path: "/profile", priority: "High" },
      { label: "My Appointments", path: "/appointments", priority: "High" },
      { label: "My Cart", path: "/cart", priority: "Medium" },
      { label: "My Orders", path: "/orders", priority: "Medium" },
      { label: "Vitals", path: "/vitals", priority: "Medium" },
    ],
  },
  {
    title: "Services",
    icon: FaFlask,
    links: [
      { label: "Book Appointment", path: "/book-appointment", priority: "High" },
      { label: "Lab Test Details", path: "/lab-tests", priority: "Medium" },
      { label: "Products", path: "/products", priority: "Medium" },
      { label: "Prescriptions", path: "/prescriptions", priority: "Medium" },
      { label: "Health Records", path: "/files", priority: "Medium" },
    ],
  },
  {
    title: "Company Information",
    icon: FaInfoCircle,
    links: [
      { label: "About Us", path: "/about-us", priority: "Medium" },
      { label: "Contact Us", path: "/contact-us", priority: "Medium" },
      { label: "Clinic Information", path: "/clinics", priority: "Medium" },
    ],
  },
  {
    title: "Legal & Compliance",
    icon: FaFileContract,
    links: [
      { label: "Terms and Conditions", path: "/terms-and-conditions", priority: "Low" },
      { label: "Privacy Policy", path: "/privacy-policy", priority: "Low" },
      { label: "Cookie Privacy", path: "/privacy-policy", priority: "Low" },
      { label: "Sitemap", path: "/sitemap", priority: "Low" },
    ],
  },
];

const getPriorityColor = (priority) => {
  switch (priority) {
    case "High":
      return "red";
    case "Medium":
      return "orange";
    case "Low":
      return "gray";
    default:
      return "blue";
  }
};

export default function Sitemap() {
  return (
    <Box bg="#f8f9fa" minH="100vh" py={12}>
      <Container maxW="6xl" px={{ base: 4, md: 6, lg: 8 }}>
        {/* Header Section */}
        <VStack spacing={4} py={12} textAlign="center">
          <Heading as="h1" size="2xl" color="#1f48dd" fontWeight={700}>
            Sitemap
          </Heading>
          <Text fontSize="lg" color="gray.600" maxW="500px">
            Explore all pages and resources available on GentRx. Navigate easily to find what you&apos;re looking for.
          </Text>
        </VStack>

        <Divider my={8} borderColor="gray.300" />

        {/* Sitemap Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 2 }} spacing={8} py={8}>
          {sitemapSections.map((section, idx) => (
            <Box
              key={idx}
              bg="white"
              borderRadius="lg"
              boxShadow="sm"
              overflow="hidden"
              borderLeft="4px solid #1f48dd"
              transition="all 0.3s ease"
              _hover={{
                boxShadow: "md",
                transform: "translateY(-2px)",
              }}
            >
              {/* Section Header */}
              <Box bg="linear-gradient(135deg, #1f48dd 0%, #1e40af 100%)" p={6} color="white">
                <HStack spacing={3}>
                  <Icon as={section.icon} fontSize="24px" />
                  <Heading as="h2" size="md" fontWeight={600}>
                    {section.title}
                  </Heading>
                </HStack>
              </Box>

              {/* Links List */}
              <VStack align="start" spacing={0} divider={<Divider />}>
                {section.links.map((link, linkIdx) => (
                  <Link
                    key={linkIdx}
                    as={RouterLink}
                    to={link.path}
                    w="100%"
                    px={6}
                    py={4}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    _hover={{
                      bg: "#f0f4ff",
                      textDecoration: "none",
                    }}
                    transition="all 0.2s ease"
                    textDecoration="none"
                  >
                    <Text fontWeight={500} color="gray.800" fontSize="sm">
                      {link.label}
                    </Text>
                    <Badge
                      colorScheme={getPriorityColor(link.priority)}
                      fontSize="xs"
                      fontWeight={600}
                    >
                      {link.priority}
                    </Badge>
                  </Link>
                ))}
              </VStack>
            </Box>
          ))}
        </SimpleGrid>

        <Divider my={12} borderColor="gray.300" />

        {/* Info Section */}
        <Box
          bg="linear-gradient(135deg, #1f48dd 0%, #1e40af 100%)"
          borderRadius="lg"
          p={{ base: 6, md: 8 }}
          color="white"
          textAlign="center"
          boxShadow="md"
        >
          <Heading as="h3" size="md" mb={4} fontWeight={600}>
            Can&apos;t Find What You&apos;re Looking For?
          </Heading>
          <Text mb={6} fontSize="sm" opacity={0.9}>
            Our comprehensive sitemap covers all main sections and pages. For additional help, please contact our support team.
          </Text>
          <HStack justify="center" spacing={4}>
            <Link
              as={RouterLink}
              to="/contact-us"
              bg="white"
              color="#1f48dd"
              px={6}
              py={2}
              borderRadius="md"
              fontWeight={600}
              fontSize="sm"
              _hover={{ bg: "gray.100", textDecoration: "none" }}
            >
              Contact Support
            </Link>
            <Link
              as={RouterLink}
              to="/"
              bg="rgba(255,255,255,0.2)"
              px={6}
              py={2}
              borderRadius="md"
              fontWeight={600}
              fontSize="sm"
              border="2px solid white"
              _hover={{ bg: "rgba(255,255,255,0.3)", textDecoration: "none" }}
            >
              Back to Home
            </Link>
          </HStack>
        </Box>

        {/* Footer Note */}
        <Box mt={12} p={6} bg="white" borderRadius="lg" borderLeft="4px solid #1f48dd">
          <Text fontSize="sm" color="gray.600">
            <strong>Last Updated:</strong> April 1, 2026 | <strong>Pages:</strong> 10+ main sections | 
            <strong> Format:</strong> <Link href="/sitemap.xml" isExternal color="#1f48dd" fontWeight={600}>
              XML Sitemap
            </Link> also available for search engines.
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
