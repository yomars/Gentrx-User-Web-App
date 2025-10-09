import { Box, Flex, Text } from "@chakra-ui/react";
import UserProfile from "../Components/UserProfile";

function Profile() {
  return (
    <Box pb={20}>
      {" "}
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "10" }}>
        <Box className="container">
          <Text
            fontSize={{ base: 24, md: 32 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            User Profile
          </Text>
        </Box>
      </Box>
      <Box className="container" maxW={"700px"}>
        <Flex gap={5} flexDir={{ base: "column", md: "row" }}>
          <Box flex={1}>
            <UserProfile />
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}

export default Profile;
