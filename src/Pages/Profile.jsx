import { Box, Flex, Text, Image } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import UserProfile from "../Components/UserProfile";
import ChangePassword from "../Components/ChangePassword.jsx";
import user from "../Controllers/user";
import { GET_AUTH } from "../Controllers/ApiControllers";
import Loading from "../Components/Loading";
import ErrorPage from "./ErrorPage";
import logoutFn from "../Controllers/logout";
import { useEffect } from "react";
import moment from "moment";

function Profile() {
  const getProfileData = async () => {
    const res = await GET_AUTH(user.token, "patient/me");
    return res.data;
  };

  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ["user", user?.id],
    queryFn: getProfileData,
    enabled: Boolean(user?.token),
  });

  useEffect(() => {
    if (!error) return;

    const status = error?.response?.status ?? error?.cause?.status;
    const message = String(error?.message || "").toLowerCase();
    if (
      status === 401 ||
      message.includes("unauthorized") ||
      message.includes("invalid or expired token") ||
      message.includes("session expired")
    ) {
      logoutFn();
    }
  }, [error]);

  if (isLoading) return <Loading />;
  if (error) {
    const status = error?.response?.status ?? error?.cause?.status;
    if (status === 401) return null;
    return <ErrorPage />;
  }

  const displayName = [profileData?.f_name, profileData?.l_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const memberSince = profileData?.created_at || user?.created_at;

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
              {displayName || "Patient"}
            </Text>
            {profileData?.patient_code ? (
              <Text
                fontSize={{ base: "xs", sm: "sm", md: "md" }}
                fontWeight="semibold"
                lineHeight="short"
                mb={{ base: 0.5, md: 1 }}
              >
                Patient Code: {profileData.patient_code}
              </Text>
            ) : null}
            <Text
              fontSize={{ base: "xs", sm: "sm", md: "md" }}
              fontWeight="medium"
            >
              Member since {memberSince ? moment(memberSince).format("MMMM YYYY") : "-"}
              
            </Text>
          </Box>
        </Box>
      </Box>

      <Box className="container" maxW={"1000px"}>
        <Flex gap={5} flexDir={{ base: "column", md: "row" }}>
          <Box flex={1}>
            <UserProfile
              userData={profileData}
              isLoading={isLoading}
              error={error}
            />
          </Box>
          <Box flex={1}>
            <ChangePassword />
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}

export default Profile;
