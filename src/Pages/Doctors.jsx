/* eslint-disable react/no-children-prop */
/* eslint-disable react-hooks/rules-of-hooks */
import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import {
  Box,
  Flex,
  Image,
  Skeleton,
  Text,
  Grid,
  GridItem,
  Divider,
  IconButton,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  InputGroup,
  InputLeftElement,
  Input,
} from "@chakra-ui/react";
import imageBaseURL from "./../Controllers/image";
import "swiper/css";
import "swiper/css/pagination";
import Loading from "../Components/Loading";
import RatingStars from "../Hooks/RatingStars";
import {
  FaInstagram,
  FaFacebook,
  FaTwitter,
  FaYoutube,
  FaUserAlt,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import ErrorPage from "./ErrorPage";
import { SearchIcon } from "@chakra-ui/icons";
import { useCity } from "../Context/SelectedCity";
import { BsHospitalFill } from "react-icons/bs";
import { ImLocation } from "react-icons/im";
import NotAvailable from "../Components/NotAvailable";
import LocationSeletor from "../Components/LocationSeletor";
import useSearchFilter from "../Hooks/UseSearchFilter";

export default function Doctors() {
  const { selectedCity } = useCity();

  const getData = async () => {
    const res = await GET(
      `get_doctor?active=1&city_id=${selectedCity?.id || ""}`
    );
    return res.data;
  };
  const { isLoading, data, error } = useQuery({
    queryKey: ["Doctors", selectedCity],
    queryFn: getData,
  });

  const { handleSearchChange, searchTerm, filteredData } =
    useSearchFilter(data);

  if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;

  return (
    <Box>
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "20" }}>
        <Box className="container">
          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 32, md: 48 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Our Doctors
          </Text>
          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 22, md: 32 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Explore a Multifaceted Team of <br />
            <Text as={"span"} color={"green.text"} fontWeight={800}>
              Healthcare Specialists
            </Text>
          </Text>
        </Box>
      </Box>{" "}
      <Box
        mt={{ base: 0, md: 0 }}
        className="container"
        pt={5}
        position={"relative"}
      >
        <Text
          fontSize={16}
          textAlign={"center"}
          mt={2}
          color={"gray.500"}
          fontWeight={500}
        >
          Experience the ease of finding the right medical <br /> expert for
          your needs with our comprehensive selection of doctors.
        </Text>
        <Flex
          justifyContent={"center"}
          w={"100%"}
          flexDir={{
            base: "column",
            md: "row",
          }}
          gap={{
            base: 4,
            md: 0,
          }}
          mt={5}
        >
          {" "}
          <LocationSeletor type="search" />
          <InputGroup mb={4} maxW={"fit-content"} borderLeftRadius={0}>
            <InputLeftElement children={<SearchIcon />} />
            <Input
              placeholder="Search doctors..."
              variant="outline"
              w={500}
              maxW={"100vw"}
              bg={"#fff"}
              borderLeftRadius={{ base: 6, md: 0 }}
              onChange={(e) => {
                handleSearchChange(e.target.value);
              }}
              value={searchTerm}
            />
          </InputGroup>
        </Flex>
        {filteredData ? (
          <>
            {" "}
            <Box>
              <Box mt={4}>
                {filteredData?.length ? (
                  <Grid
                    templateColumns={{
                      base: "repeat(1, 1fr)",
                      md: "repeat(2, 1fr)",
                      lg: "repeat(3, 1fr)",
                    }}
                    gap={6}
                  >
                    {filteredData?.map((item) => (
                      <GridItem
                        key={item.id}
                        backgroundColor={"#FFF"}
                        borderRadius={10}
                        cursor={"pointer"}
                        boxShadow={"2px 2px 20px 0 rgb(82 66 47 / 12%)"}
                        _hover={{ border: "1px solid #0032ff" }}
                        transition={"border 0.1s ease"}
                        border={"1px solid #fff"}
                        as={Link}
                        to={`/doctor/${item.user_id}`}
                      >
                        <Box cursor={"pointer"} padding={5}>
                          {" "}
                          <Flex gap={{ base: 3, md: 5 }} align="center">
                            <Box
                              flexShrink={0}
                              overflow="hidden"
                              h={{ base: "80px", md: "90px", lg: "100px" }} // Responsive height
                              w={{ base: "80px", md: "90px", lg: "100px" }} // Responsive width
                              borderRadius="15%" // Consistent, modern radius
                              border={item.image ? "4px solid #fff" : "none"} // Thinner border
                              boxShadow="0px 0px 10px rgba(0,0,0,0.1)" // Subtle shadow
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
                            <Box>
                              {" "}
                              <Text
                                mt={5}
                                fontSize={15}
                                fontWeight={700}
                                m={0}
                                noOfLines={1}
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
                              <ImLocation fontSize={16} />{" "}
                              {item.clinics_address}
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
                          {item?.stop_booking === 1 && (
                            <Alert
                              status="error"
                              size={"xs"}
                              py={1}
                              px={1}
                              mt={4}
                            >
                              <AlertIcon />
                              <AlertTitle fontSize={"xs"}>
                                {" "}
                                Currently Not Accepting Appointments
                              </AlertTitle>
                            </Alert>
                          )}
                          <Divider my={2} />
                          <HStack spacing={2}>
                            <IconButton
                              as="a"
                              href={item.insta_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Instagram"
                              icon={<FaInstagram />}
                              variant="ghost"
                              colorScheme="pink"
                              onClick={(e) => e.stopPropagation()}
                            />{" "}
                            <IconButton
                              as="a"
                              href={item.fb_linik}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Facebook"
                              icon={<FaFacebook />}
                              variant="ghost"
                              colorScheme="facebook"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <IconButton
                              as="a"
                              href={item.twitter_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Twitter"
                              icon={<FaTwitter />}
                              variant="ghost"
                              colorScheme="twitter"
                              onClick={(e) => e.stopPropagation()}
                            />{" "}
                            <IconButton
                              as="a"
                              href={item.you_tube_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="YouTube"
                              icon={<FaYoutube />}
                              variant="ghost"
                              colorScheme="red"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </HStack>
                        </Box>
                      </GridItem>
                    ))}
                  </Grid>
                ) : (
                  <NotAvailable name={"Doctors"} />
                )}
              </Box>
            </Box>
          </>
        ) : (
          <NotAvailable name={"Doctors"} />
        )}
        {isLoading ? (
          <>
            {" "}
            <Skeleton h={"100px"} w={"100%"} mt={5} />
          </>
        ) : null}
        {error ? (
          <>
            {" "}
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
              Cant Fetch Doctors!
            </Text>
          </>
        ) : null}
      </Box>
    </Box>
  );
}
