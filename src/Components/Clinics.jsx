import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Image,
  Skeleton,
  Text,
  VStack,
  useColorModeValue, Button
} from "@chakra-ui/react";
import imageBaseURL from "./../Controllers/image";
import "swiper/css";
import { Link } from "react-router-dom";
import ErrorPage from "../Pages/ErrorPage";
import { useCity } from "../Context/SelectedCity";
import NotAvailable from "./NotAvailable";

export default function Clinics() {
  const { selectedCity } = useCity();

  const getData = async () => {
    const url = selectedCity
      ? `get_clinic?start=0&end=3&active=1&city_id=${selectedCity.id}`
      : `get_clinic?start=0&end=3&active=1`;
    const res = await GET(url);
    return res.data;
  };

  const { isLoading, data, error } = useQuery({
    queryKey: ["clinics", selectedCity?.id],
    queryFn: getData,
  });

  const bgColor = useColorModeValue("#fff");
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("teal.700", "teal.300");

  if (error) return <ErrorPage />;

  return (
    <Box bg={bgColor} py={{ base: 8, md: 12 }}>
      <Box className="container">
        {isLoading ? (
          <Grid
            templateColumns={{
              base: "repeat(1, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            }}
            gap={6}
          >
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height="350px" borderRadius="lg" />
            ))}
          </Grid>
        ) : data ? (
          <>
            <VStack spacing={4} mb={10}>
              <Heading
                fontFamily="Quicksand, sans-serif"
                fontSize={{ base: "2xl", md: "4xl" }}
                fontWeight="extrabold"
                color={textColor}
                textAlign="center"
                letterSpacing="wide"
              >
                {selectedCity
                  ? `Top Clinics in ${selectedCity.city}`
                  : "Our Clinics"}
              </Heading>
              <Text
                fontSize={{ base: "md", md: "lg" }}
                textAlign="center"
                color="gray.600"
                _dark={{ color: "gray.300" }}
                maxW="2xl"
                mx="auto"
              >
                Discover specialized healthcare services tailored to your needs,
                all in one place
              </Text>
            </VStack>

            {data.length ? (
              <Box>
                {" "}
                <Grid
                  templateColumns={{
                    base: "repeat(1, 1fr)",
                    md: "repeat(2, 1fr)",
                    lg: "repeat(3, 1fr)",
                  }}
                  gap={8}
                  justifyContent="center"
                >
                  {data.map((item) => (
                    <GridItem
                      key={item.id}
                      as={Link}
                      to={`/clinic/${item.title}/${item.id}`}
                      bg={cardBg}
                      borderRadius="xl"
                      overflow="hidden"
                      boxShadow="lg"
                      transition="all 0.3s ease"
                      border={"2px solid transparent"}
                      _hover={{
                        boxShadow: "2xl",
                        transform: "translateY(-6px)",
                        borderColor: "green.800",
                      }}
                    >
                      {/* Image Header */}
                      <Box
                        h="150px"
                        w="100%"
                        position="relative"
                        overflow="hidden"
                        bg="gray.200"
                      >
                        <Image
                          src={
                            item.image
                              ? `${imageBaseURL}/${item.image}`
                              : "imagePlaceholder.png"
                          }
                          alt={item.title}
                          objectFit="cover"
                          w="100%"
                          h="100%"
                          fallback={<Box bg="gray.300" w="100%" h="100%" />}
                          transition="all 0.3s"
                          _hover={{ transform: "scale(1.05)" }}
                        />
                      </Box>

                      {/* Content */}
                      <VStack p={5} align="start">
                        <Text
                          fontSize="xl"
                          fontWeight="bold"
                          color="gray.800"
                          _dark={{ color: "gray.100" }}
                        >
                          {item.title}
                        </Text>
                        <Text
                          fontSize="sm"
                          color="gray.600"
                          _dark={{ color: "gray.300" }}
                          noOfLines={2}
                        >
                          {item.description || "No description available"}
                        </Text>

                        <Text
                          fontSize="sm"
                          color="gray.500"
                          _dark={{ color: "gray.400" }}
                          fontStyle="italic"
                          mb={0}
                        >
                          {item.address || "Address not specified"}
                        </Text>
                        {item.city_title && (
                          <Text
                            mt={-1}
                            fontSize="xs"
                            color="green.600"
                            _dark={{ color: "green.400" }}
                            fontWeight="medium"
                          >
                            {item.city_title}, {item.state_title}
                          </Text>
                        )}
                      </VStack>
                    </GridItem>
                  ))}
                </Grid>{" "}
                <Flex justify={"center"} mt={5}>
                  <Button
                    fontWeight={600}
                    size={"sm"}
                    colorScheme="green"
                    w={300}
                    as={Link}
                    to={"/clinics"}
                  >
                    See All Clinics{">>"}
                  </Button>
                </Flex>
              </Box>
            ) : (
              <NotAvailable name="Clinics" />
            )}
          </>
        ) : null}
      </Box>
    </Box>
  );
}
