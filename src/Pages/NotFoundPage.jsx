import { Box, Heading, Text, Button, Image } from "@chakra-ui/react";
import { Link } from "react-router-dom"; // Assuming you're using React Router for navigation

export function NotFoundPage() {
  return (
    <Box>
      <div className="container">
        <Box
          textAlign="center"
          py={10}
          px={6}
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minH="100vh"
          bg="gray.50"
        >
          <Image
            src={"/404.svg"}
            alt="Not Found"
            boxSize={{ base: "200px", md: "300px" }}
          />
          <Heading
            as="h1"
            size={{ base: "xl", md: "2xl" }}
            mt={6}
            mb={2}
            fontWeight="bold"
          >
            Something is not right...
          </Heading>
          <Text color="gray.500" fontSize={{ base: "sm", md: "md" }}>
            The page you are trying to access does not exist. You may have
            mistyped the URL or the page has been moved to another location. If
            you believe this is an error, please contact our support team. We
            apologize for any inconvenience caused and appreciate your
            understanding.
          </Text>
          <Button
            as={Link}
            to="/"
            mt={6}
            colorScheme="red"
            variant="solid"
            size="sm"
          >
            Get back to home page
          </Button>
        </Box>
      </div>
    </Box>
  );
}
