import { Box, Flex, Text, Image } from "@chakra-ui/react";
import UserProfile from "../Components/UserProfile";
import user from "../Controllers/user";
import moment from "moment";

function Profile() {
  return (
    <Box pb={20}>
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

      {/* Membership Card */}
      <Box className="container" maxW={"700px"} mt={4} mb={2} px={4}>
        <Box
          position="relative"
          width="100%"
          height={{ base: "200px", sm: "250px", md: "300px", lg: "400px" }}
          borderRadius={{ base: "lg", md: "xl" }}
          overflow="hidden"
          boxShadow="xl"
        >
          <Image
            src="bronzecard.jpeg"
            alt="Membership Card"
            width="100%"
            height="100%"
            objectFit="cover"
          />
          <Box
            position="absolute"
            bottom={{ base: 3, sm: 4, md: 6 }}
            left={{ base: 3, sm: 4, md: 6 }}
            color="white"
            textShadow="1px 1px 2px rgba(0,0,0,0.5)"
            p={2}
            borderRadius="md"
            backgroundColor="rgba(0,0,0,0.3)"
          >
            <Text
              fontSize={{ base: "lg", sm: "xl", md: "2xl" }}
              fontWeight="bold"
              mb={{ base: 0.5, md: 1 }}
              lineHeight="short"
            >
              {user?.f_name} {user?.l_name}
            </Text>
            <Text
              fontSize={{ base: "xs", sm: "sm", md: "md" }}
              fontWeight="medium"
            >
              Member since {moment(user?.created_at).format("MMMM YYYY")}
            </Text>
          </Box>
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
