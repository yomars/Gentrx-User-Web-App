import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Skeleton,
  Text,
  Divider,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import imageBaseURL from "./../Controllers/image";
import "swiper/css";
import { Link } from "react-router-dom";
import { FaUserAlt } from "react-icons/fa";
import RatingStars from "../Hooks/RatingStars";
import { useCity } from "../Context/SelectedCity";
import { BsHospitalFill } from "react-icons/bs";
import { ImLocation } from "react-icons/im";
import NotAvailable from "./NotAvailable";

export default function Doctors() {
  const { selectedCity } = useCity();

  const getData = async () => {
    const url = selectedCity
      ? `get_doctor?active=1&city_id=${selectedCity.id}`
      : `get_doctor?active=1`;
    const res = await GET(url);
    return res.data.length > 6 ? res.data.slice(0, 6) : res.data;
  };
  const { isLoading, data, error } = useQuery({
    queryKey: ["doctors", selectedCity],
    queryFn: getData,
  });

  return (
    <Box mt={5} className="container">
      {data ? (
        <>
          <Heading color={"primary.text"} fontWeight={600} textAlign={"center"}>
            {selectedCity
              ? `Best Doctors in ${selectedCity.city}`
              : "Best Doctors"}
          </Heading>
          <Text
            fontSize={14}
            textAlign={"center"}
            mt={2}
            color={"gray.500"}
            fontWeight={500}
          >
            Our team of expert doctors spans a wide range of specialties,
            ensuring you receive the highest quality care tailored to your
            individual needs.
          </Text>
          {data.length ? (
            <Box mt={4} maxW={"100vw"} overflow={"hidden"}>
              <Grid
                w="100%"
                templateColumns={{
                  base: "repeat(1, 1fr)",
                  md: data?.length === 1 ? "1fr" : "repeat(2, 1fr)", // Center if only 1 item
                  lg: data?.length === 1 ? "1fr" : "repeat(3, 1fr)", // Center if only 1 item
                }}
                spacing={4}
                gap={6}
                placeItems="center"
                justifyContent={data?.length <= 2 ? "center" : "space-between"}
              >
                {data?.map((item) => (
                  <GridItem
                    key={item.id}
                    backgroundColor={"#fff"}
                    borderRadius={10}
                    cursor={"pointer"}
                    boxShadow={"2px 2px 20px 0 rgb(82 66 47 / 12%)"}
                    _hover={{ border: "1px solid #0032ff" }}
                    transition={"border 0.1s ease"}
                    border={"1px solid #fff"}
                    as={Link}
                    to={`/doctor/${item.user_id}`}
                    w={400}
                    maxW={"95vw"}
                  >
                    <Box cursor={"pointer"} padding={5}>
                      {" "}
                      <Flex gap={5} align={"center"}>
                        <Box
                          overflow={"hidden"}
                          h={"90px"}
                          w={"90px"}
                          borderRadius={item.image ? "10%" : "0"}
                          borderTopRadius={"50%"}
                          border={"8px solid #fff"}
                        >
                          {" "}
                          <Image
                            src={
                              item.image
                                ? `${imageBaseURL}/${item.image}`
                                : "https://plus.unsplash.com/premium_photo-1661764878654-3d0fc2eefcca?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGRvY3RvcnxlbnwwfHwwfHx8MA%3D%3D"
                            }
                            w={{ base: "80px", md: "80px" }}
                          />
                        </Box>
                        <Box>
                          {" "}
                          <Text mt={5} fontSize={15} fontWeight={500} m={0}>
                            {item.f_name} {item.l_name}
                          </Text>
                          <Text
                            mt={"2px"}
                            fontSize={{
                              base: "12px",
                              md: "13px",
                              lg: "13px",
                            }}
                            m={0}
                            color={"primary.text"}
                            fontWeight={600}
                            fontFamily={"Quicksand, sans-serif"}
                          >
                            {item.specialization}
                          </Text>
                          <Text
                            as={"span"}
                            display={"flex"}
                            gap={1}
                            alignItems={"center"}
                          >
                            <RatingStars rating={item.average_rating} />{" "}
                            <Text
                              as={"span"}
                              mb={0}
                              color={"#000"}
                              fontSize={12}
                            >
                              {parseFloat(item.average_rating).toFixed(1)} (
                              {item.number_of_reviews})
                            </Text>
                          </Text>
                          <Text
                            as={"span"}
                            display={"flex"}
                            gap={1}
                            alignItems={"center"}
                            fontSize={14}
                            color={"#000"}
                            fontWeight={700}
                          >
                            Exp {item.ex_year}+ Years
                          </Text>
                        </Box>
                      </Flex>
                      <Divider my={2} />
                      <Box>
                        <Text
                          fontSize={13}
                          fontFamily={"Quicksand, sans-serif"}
                          fontWeight={600}
                          color={"gray.700"}
                          display={"flex"}
                          align={"center"}
                          gap={2}
                        >
                          <BsHospitalFill /> {item.clinic_title}
                        </Text>
                        <Text
                          fontSize={13}
                          fontFamily={"Quicksand, sans-serif"}
                          fontWeight={600}
                          color={"gray.700"}
                          display={"flex"}
                          align={"left"}
                          gap={2}
                        >
                          <ImLocation fontSize={16} /> {item.clinics_address}
                        </Text>
                      </Box>
                      <Flex justify={"space-between"} mt={1}>
                        <Text
                          fontSize={12}
                          fontFamily={"Quicksand, sans-serif"}
                          fontWeight={600}
                          color={"gray.500"}
                          display={"flex"}
                          align={"center"}
                          gap={2}
                        >
                          <FaUserAlt fontSize={12} />{" "}
                          <Text mt={-0.5}>
                            {item.total_appointment_done} Appointments Done
                          </Text>
                        </Text>
                      </Flex>
                    </Box>
                  </GridItem>
                ))}
              </Grid>

              <Flex justify={"center"} mt={5}>
                <Button
                  fontWeight={600}
                  size={"sm"}
                  colorScheme="green"
                  w={300}
                  as={Link}
                  to={"/doctors"}
                >
                  See all {">>"}
                </Button>
              </Flex>
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
