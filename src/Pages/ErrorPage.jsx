import {
  Box,
  Heading,
  Text,
  Image,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect } from "react";
import logoutFn from "../Controllers/logout";

const ErrorPage = () => {
  const textColor = useColorModeValue("gray.700", "gray.300");

  useEffect(() => {
    document.title = "500 Internal Server Error";
  }, []);

  return (
    <Box
      textAlign="center"
      py={10}
      px={6}
      bg={useColorModeValue("gray.50", "gray.800")}
      minH="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Image
        src="/broken.gif"
        alt="Error Illustration"
        boxSize="200px"
        mb={6}
      />

      <Heading as="h1" size="2xl" color={textColor}>
        <Text fontSize="6xl" fontWeight="bold" color="red.500">
          500
        </Text>
        Internal Server Error
      </Heading>

      <Text fontSize="lg" mt={4} color={textColor}>
        Oops! Something went wrong on our end. We are currently working on
        fixing the issue.
      </Text>

      <Text fontSize="md" mt={2} color={textColor}>
        Please try refreshing the page, or you can return to the homepage.
      </Text>

      <Button
        colorScheme="green"
        mt={6}
        onClick={() => {
          logoutFn();
          
        }}
      >
        Try Again
      </Button>
    </Box>
  );
};

export default ErrorPage;
