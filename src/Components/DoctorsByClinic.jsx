/* eslint-disable react/prop-types */
import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import {
  Box,
  Flex,
  Image,
  Skeleton,
  Text,
  GridItem,
  SimpleGrid,
} from "@chakra-ui/react";
import imageBaseURL from "./../Controllers/image";
import "swiper/css";
import { Link } from "react-router-dom";
import RatingStars from "../Hooks/RatingStars";
import NotAvailable from "./NotAvailable";

export default function DoctorsByClinic({ clinicID, clinicName }) {
  const getData = async () => {
    const res = await GET(
      `get_doctor?active=1&search_query=${clinicName}&clinic_id=${clinicID}`
    );
    return res.data.length > 6 ? res.data.slice(0, 6) : res.data;
  };
  const { isLoading, data, error } = useQuery({
    queryKey: ["doctors", clinicID, clinicName],
    queryFn: getData,
  });

  return (
    <Box mt={5}>
      {data ? (
        <>
          {data.length ? (
            <Box mt={4} maxW={"100vw"} overflow={"hidden"}>
              <SimpleGrid
                w="100%"
                columns={{
                  base: 1,
                  md: 1,
                  lg: data?.length === 1 ? 1 : 1,
                  xl: data?.length === 1 ? 1 : 1, // 2 columns for xl if more than 1 item
                }}
                spacing={6}
                placeItems="center"
                justifyContent={data?.length <= 2 ? "center" : "space-between"}
                p={2}
              >
                {data?.map((item) => (
                  <GridItem
                    key={item.id}
                    backgroundColor="#fff"
                    borderRadius="lg" // Softer, modern radius
                    cursor="pointer"
                    _hover={{
                      boxShadow: "md", // Subtle shadow on hover
                      borderColor: "#0032ff", // Blue border on hover
                      transform: "translateY(-2px)", // Slight lift effect
                    }}
                    transition="all 0.2s ease" // Smooth transition for all changes
                    border="2px solid"
                    borderColor="gray.100" // Light gray default border
                    as={Link}
                    to={`/doctor/${item.user_id}`}
                    w={{ base: "100%", md: "100%" }} // Full width on mobile, auto on larger screens
                    boxShadow="sm" // Default subtle shadow
                    overflow="hidden" // Prevents content overflow
                  >
                    <Box
                      p={{ base: 2, md: 4 }}
                      display="flex"
                      alignItems="start"
                      gap={{ base: 2, md: 4 }}
                    >
                      {/* Doctor Image */}
                      <Box
                        flexShrink={0} // Prevents image from shrinking
                        overflow="hidden"
                        h={{ base: "100px", md: "120px", lg: "140px" }} // Adjusted sizes
                        w={{ base: "100px", md: "120px", lg: "140px" }}
                        borderRadius={item.image ? "15%" : "0"} // Slightly larger radius
                        border={item.image ? "4px solid #fff" : "none"} // Thinner border
                        boxShadow="0px 0px 15px rgba(0,0,0,0.09)" // Soft shadow
                      >
                        <Image
                          src={
                            item.image
                              ? `${imageBaseURL}/${item.image}`
                              : "https://plus.unsplash.com/premium_photo-1661764878654-3d0fc2eefcca?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGRvY3RvcnxlbnwwfHwwfHx8MA%3D%3D"
                          }
                          objectFit="cover"
                          w="100%"
                          h="100%"
                          alt={`Dr. ${item.f_name} ${item.l_name}`}
                        />
                      </Box>

                      {/* Doctor Details */}
                      <Box flex={1} minW={0}>
                        {" "}
                        {/* Ensures text doesn’t overflow */}
                        <Text
                          fontSize={{ base: "lg", md: "xl" }} // Larger, readable text
                          fontWeight="bold"
                          color="gray.800"
                          noOfLines={1} // Prevents overflow
                        >
                          Dr. {item.f_name} {item.l_name}
                        </Text>
                        <Text
                          fontSize={{ base: "sm", md: "md" }}
                          color="gray.600"
                          fontWeight="medium"
                          noOfLines={1}
                        >
                          {item.department_name} • {item.specialization}
                        </Text>
                        <Text
                          fontSize={{ base: "sm", md: "md" }}
                          color="gray.500"
                          noOfLines={1}
                        >
                          {item.clinic_title}, {item.city_title}
                        </Text>
                        {/* Rating and Experience */}
                        <Flex gap={3} alignItems="center" flexWrap="wrap">
                          {item.average_rating > 0 && (
                            <Flex alignItems="center" gap={1}>
                              <RatingStars
                                rating={parseFloat(item.average_rating) || 0}
                              />
                              <Text fontSize="sm" color="gray.700">
                                {parseFloat(item.average_rating).toFixed(1)} (
                                {item.number_of_reviews || 0})
                              </Text>
                            </Flex>
                          )}
                          <Text
                            fontSize="sm"
                            color="gray.700"
                            fontWeight="semibold"
                          >
                            Exp: {item.ex_year || 0}+ Years
                          </Text>
                        </Flex>
                        {/* Fees */}
                        <Text
                          mt={1}
                          fontSize={{ base: "xs", md: "sm" }}
                          color="green.600"
                          fontWeight="600"
                        >
                          OPD Fee: ₹{item.opd_fee} | Video Fee: ₹{item.video_fee}
                        </Text>
                      </Box>
                    </Box>
                  </GridItem>
                ))}
              </SimpleGrid>
            </Box>
          ) : (
            <NotAvailable name={"Doctors"} />
          )}
        </>
      ) : null}
      {isLoading ? <Skeleton h={"100px"} w={"100%"} mt={5} /> : null}
      {error ? (
        <>
          <Text
            fontSize={{ base: 12, md: 14 }}
            fontWeight={400}
            color={"red"}
            textAlign={"center"}
          >
            Something Went wrong!
          </Text>
          <Text
            fontSize={{ base: 12, md: 14 }}
            fontWeight={400}
            color={"red"}
            textAlign={"center"}
          >
            Can&apos;t Fetch Doctors!
          </Text>
        </>
      ) : null}
    </Box>
  );
}
