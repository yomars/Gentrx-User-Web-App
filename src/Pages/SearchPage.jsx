import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  Grid,
  GridItem,
  Image,
  Input,
  SkeletonCircle,
  SkeletonText,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useCity } from "../Context/SelectedCity";
import { Link, useSearchParams } from "react-router-dom";
import { GET } from "../Controllers/ApiControllers";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import imageBaseURL from "../Controllers/image";
import RatingStars from "../Hooks/RatingStars";
import { BsHospitalFill } from "react-icons/bs";
import { ImLocation } from "react-icons/im";
import { FaUserAlt } from "react-icons/fa";
import LocationSeletor from "../Components/LocationSeletor";
import NotAvailable from "../Components/NotAvailable";
import { buildDoctorEndpoint } from "../lib/doctorQuery";

const getDept = async () => {
  const res = await GET("get_department_active");
  return res.data;
};

function SearchPage() {
  const { selectedCity } = useCity();
  const [selectedDept, setselectedDept] = useState();
  const [searchTerm, setsearchTerm] = useState();
  const [searchParams, setSearchParams] = useSearchParams();

  const { isLoading: deptLoading, data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: getDept,
  });

  const getDoctors = async () => {
    const endpoint = await buildDoctorEndpoint({
      selectedCity,
      department: selectedDept?.id,
      search: searchParams.get("search") || "",
    });
    const res = await GET(endpoint);
    return res.data;
  };

  const { isLoading, data } = useQuery({
    queryKey: [
      "Doctors",
      selectedCity,
      selectedDept,
      searchParams.get("search"),
    ],
    queryFn: getDoctors,
  });
  useEffect(() => {
    if (searchParams.get("search")) {
      setsearchTerm(searchParams.get("search"));
    } else {
      setsearchTerm("");
    }
  }, [searchParams]);

  return (
    <Box>
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "10" }}>
        <Box className="container">
          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 20, md: 28 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Search doctor
          </Text>
        </Box>
      </Box>
      <Box className="container" mt={4}>
        <Flex justify={"center"}>
          <Box maxW={"98vw"} w={"700px"}>
            {" "}
            <Box p={2} bg="#fff" borderRadius={8} boxShadow="md">
              <Flex
                flexDir={{ base: "column", md: "row" }}
                gap={{
                  base: 2,
                  md: 0,
                }}
              >
                <LocationSeletor type="search" />
                <FormControl isRequired>
                  <Input
                    borderLeftRadius={{ base: 6, md: 0 }}
                    borderRightRadius={{ base: 6, md: 0 }}
                    autoFocus={true}
                    onChange={(e) => setsearchTerm(e.target.value)}
                    placeholder="Search for doctors, clinics, and specializations."
                    value={searchTerm}
                  />
                </FormControl>
                <Button
                  borderLeftRadius={{ base: 6, md: 0 }}
                  colorScheme="facebook"
                  onClick={() => {
                    if (searchTerm) {
                      setSearchParams({ search: searchTerm });
                    } else {
                      setSearchParams({ search: searchTerm || "" });
                    }
                  }}
                >
                  Search
                </Button>
              </Flex>
            </Box>
            {/* Departments */}
            <Box
              p={2}
              mt={4}
              bg={"#fff"}
              borderRadius={8}
              boxShadow={"0 0 10px rgba(0, 0, 0, 0.15)"}
            >
              <Flex justify="space-between" mb={2}>
                <Text fontWeight={500}>Departments</Text>
                <Text fontWeight={500}>Swipe {">>"}</Text>
              </Flex>
              <Swiper
                spaceBetween={0}
                slidesPerView="auto"
                style={{ padding: "10px 0" }}
              >
                {(deptLoading ? [...Array(10)] : deptData)?.map(
                  (item, index) => (
                    <SwiperSlide
                      key={index}
                      style={{
                        width: "120px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Box
                        cursor={"pointer"}
                        onClick={() =>
                          selectedDept?.id === item?.id
                            ? setselectedDept(null)
                            : setselectedDept(item)
                        }
                      >
                        <Flex flexDir="column" align="center" gap={2}>
                          {deptLoading ? (
                            <>
                              <SkeletonCircle size="50px" />
                              <SkeletonText noOfLines={1} width="50px" />
                            </>
                          ) : (
                            <>
                              <Image
                                src={`${imageBaseURL}/${item.image}`}
                                w="50px"
                                borderRadius="full"
                                border={
                                  selectedDept?.id === item?.id
                                    ? "4px solid purple"
                                    : "none"
                                }
                              />
                              <Text fontSize="sm" fontWeight={500}>
                                {item.title}
                              </Text>
                            </>
                          )}
                        </Flex>
                      </Box>
                    </SwiperSlide>
                  )
                )}
              </Swiper>
            </Box>
            {/* Doctors */}
            <Box
              p={2}
              mt={4}
              bg={"#fff"}
              borderRadius={8}
              boxShadow={"0 0 10px rgba(0, 0, 0, 0.15)"}
            >
              <Text mb={2} fontWeight={500}>
                Doctors
              </Text>
              {isLoading ? (
                <Grid
                  templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }}
                  gap={6}
                >
                  {[...Array(10)].map((_, index) => (
                    <GridItem
                      key={index}
                      backgroundColor="#FFF"
                      borderRadius={10}
                      cursor="pointer"
                      _hover={{ border: "1px solid #0032ff" }}
                      transition="border 0.1s ease"
                      border="1px solid"
                      borderColor={"gray.200"}
                    >
                      <Box p={5}>
                        <Flex gap={4} align="center">
                          <SkeletonCircle size="100px" />
                          <SkeletonText noOfLines={3} width="100%" />
                        </Flex>
                        <Divider my={2} />
                        <SkeletonText noOfLines={3} width="100%" />
                      </Box>
                    </GridItem>
                  ))}
                </Grid>
              ) : data?.length ? (
                <Grid
                  templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }}
                  gap={6}
                >
                  {data.map((item) => (
                    <GridItem
                      key={item.id}
                      backgroundColor="#FFF"
                      borderRadius={10}
                      cursor="pointer"
                      _hover={{ border: "1px solid #0032ff" }}
                      transition="border 0.1s ease"
                      border="1px solid"
                      borderColor={"gray.200"}
                      as={Link}
                      to={`/doctor/${item.user_id}`}
                    >
                      <Box p={5}>
                        <Flex gap={4} align="center">
                          <Box
                            w="100px"
                            h="100px"
                            borderRadius="15%"
                            overflow="hidden"
                            boxShadow="0px 0px 10px rgba(0,0,0,0.1)"
                          >
                            <Image
                              src={
                                item.image
                                  ? `${imageBaseURL}/${item.image}`
                                  : "https://plus.unsplash.com/premium_photo-1661764878654-3d0fc2eefcca?w=500"
                              }
                              w="100%"
                              h="100%"
                              objectFit="cover"
                            />
                          </Box>
                          <Box>
                            <Text fontWeight={700}>
                              Dr. {item.f_name} {item.l_name}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {item.department_name} • {item.specialization}
                            </Text>
                            <Flex align="center" gap={1}>
                              <RatingStars rating={item.average_rating} />
                              <Text fontSize="xs" color="black">
                                {parseFloat(item.average_rating).toFixed(1)} (
                                {item.number_of_reviews})
                              </Text>
                            </Flex>
                            <Text fontSize="sm" fontWeight="bold">
                              Exp {item.ex_year}+ Years
                            </Text>
                          </Box>
                        </Flex>
                        <Divider my={2} />
                        <Text
                          fontSize="sm"
                          color="gray.700"
                          display="flex"
                          align="center"
                          gap={2}
                        >
                          <BsHospitalFill /> {item.clinic_title}
                        </Text>
                        <Text
                          fontSize="sm"
                          color="gray.700"
                          display="flex"
                          align="center"
                          gap={2}
                        >
                          <ImLocation /> {item.clinics_address}
                        </Text>
                        <Flex justify="space-between" mt={2}>
                          <Text
                            fontSize="xs"
                            color="gray.500"
                            display="flex"
                            align="center"
                            gap={2}
                          >
                            <FaUserAlt fontSize={12} />{" "}
                            {item.total_appointment_done} Appointments Done
                          </Text>
                        </Flex>
                      </Box>
                    </GridItem>
                  ))}
                </Grid>
              ) : (
                <NotAvailable name="Doctors" />
              )}
            </Box>
          </Box>
        </Flex>{" "}
      </Box>
    </Box>
  );
}

export default SearchPage;
