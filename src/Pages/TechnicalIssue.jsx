import {
  Box,
  Heading,
  Text,
  Image,
  useColorModeValue,
  Center,
  Flex,
} from "@chakra-ui/react";
import useSettingsData from "../Hooks/SettingData";
import { Link } from "react-router-dom";
import imageBaseURL from "../Controllers/image";

const TechnicalError = () => {
  const { settingsData } = useSettingsData();
  const logo = settingsData?.find((value) => value.id_name === "logo");
  const textColor = useColorModeValue("gray.700", "gray.300");

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
      pt={2}
    >
      <Center mb={5}>
        {" "}
        <Flex gap={2} align={"center"} as={Link} to={"/"}>
          <Image
            w={16}
            src={`${imageBaseURL}/${logo?.value}`}
            fallbackSrc={"/favicon.png"}
          />
          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontWeight={800}
            fontSize={20}
          >
            GentRx360
          </Text>
        </Flex>
      </Center>
      <Center>
        {" "}
        <Image
          src="/issue.svg"
          alt="Error Illustration"
          boxSize="300px"
          mb={6}
        />
      </Center>

      <Heading as="h1" size="2xl" color={textColor}>
        <Text fontSize="6xl" fontWeight="bold" color="red.500">
          Oops!
        </Text>
        Technical Issue
      </Heading>

      <Text fontSize="lg" mt={4} color={textColor}>
        We`re currently experiencing some technical difficulties on our end.
      </Text>

      <Text fontSize="md" mt={2} color={textColor}>
        Please try again after some time.
      </Text>
    </Box>
  );
};

export default TechnicalError;
