/* eslint-disable react/prop-types */
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalFooter,
  ModalBody,
  Button,
  Flex,
  Input,
  Text,
  Divider,
  FormControl,
  Box,
  Image,
  SkeletonCircle,
  SkeletonText,
  Grid,
  GridItem
} from "@chakra-ui/react";
import LocationSeletor from "./LocationSeletor";
import { useState } from "react";
import { useCity } from "../Context/SelectedCity";
import { Link, useNavigate } from "react-router-dom";
import { GET } from "../Controllers/ApiControllers";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import imageBaseURL from "../Controllers/image";
import RatingStars from "../Hooks/RatingStars";
import { BsHospitalFill } from "react-icons/bs";
import { ImLocation } from "react-icons/im";
import { FaUserAlt } from "react-icons/fa";
import NotAvailable from "./NotAvailable";

const getDept = async () => {
  const res = await GET("get_department_active");
  return res.data;
};
function Search({ isOpen, onClose }) {
  const [serchQuery, setserchQuery] = useState();
  const { selectedCity } = useCity();
  const navigate = useNavigate();
  const [selectedDept, setselectedDept] = useState();

  const { isLoading: deptLoading, data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: getDept,
  });

  const getDoctors = async () => {
    const res = await GET(
      `get_doctor?active=1&city_id=${selectedCity?.id || ""}&department=${
        selectedDept?.id || ""
      }&search=${serchQuery || ""}`
    );
    return res.data;
  };

  const { isLoading, data, error } = useQuery({
    queryKey: ["Doctors", selectedCity, selectedDept],
    queryFn: getDoctors,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{
        base: "sm",
        md: "2xl",
      }}
      motionPreset="slideInBottom"
      isCentered
    >
      <Overlay />
      <ModalContent>
        {" "}
        {/* Form submission on Enter */}
        <ModalBody px={2}>
          <Text
            fontSize={{ base: "lg", md: "xl" }}
            fontWeight={600}
            textAlign={"center"}
          >
            Search
          </Text>
          <Divider my={2} />{" "}
          <Box
            boxShadow={"0 0 10px rgba(0, 0, 0, 0.15)"}
            p={2}
            bg={"#fff"}
            borderRadius={8}
          >
            {" "}
            <Flex
              w={"100%"}
              flexDir={{ base: "column", md: "row" }}
              gap={{ base: 2, md: 0 }}
            >
              <LocationSeletor type="search" />
              <FormControl isRequired>
                <Input
                  onChange={(e) => setserchQuery(e.target.value)}
                  borderLeftRadius={0}
                  placeholder="Search for doctors, clinics, and specializations."
                />
              </FormControl>
            </Flex>
          </Box>
          <Box
            p={2}
            mt={4}
            bg={"#fff"}
            borderRadius={8}
            boxShadow={"0 0 10px rgba(0, 0, 0, 0.15)"}
          >
            <Flex align={"center"} justify={"space-between"} mb={2}>
              {" "}
              <Text fontSize={["sm", "md"]} color={"gray.800"} fontWeight={500}>
                Departments
              </Text>
              <Text fontSize={["sm", "md"]} color={"gray.800"} fontWeight={500}>
                Swipe {">>"}
              </Text>
            </Flex>
            <Box>
              <Swiper
                spaceBetween={0}
                slidesPerView={"auto"}
                style={{ padding: "10px 0" }}
              >
                {deptLoading
                  ? [...Array(10)].map((_, index) => (
                      <SwiperSlide
                        key={index}
                        style={{
                          width: "120px",
                          height: "auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "10px",
                        }}
                      >
                        <Box>
                          <Flex
                            flexDir={"column"}
                            gap={2}
                            alignItems={"center"}
                            justify={"center"}
                          >
                            <SkeletonCircle size="50px" />
                            <SkeletonText noOfLines={1} width={"50px"} />
                          </Flex>
                        </Box>
                      </SwiperSlide>
                    ))
                  : deptData.map((item, index) => (
                      <SwiperSlide
                        key={index}
                        style={{
                          width: "120px",
                          height: "auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "10px",
                        }}
                      >
                        <Box
                          onClick={() => {
                            selectedDept?.id === item?.id
                              ? setselectedDept(null)
                              : setselectedDept(item);
                          }}
                        >
                          <Flex
                            flexDir={"column"}
                            gap={2}
                            alignItems={"center"}
                            justify={"center"}
                          >
                            <Image
                              src={`${imageBaseURL}/${item.image}`}
                              width={"50px"}
                              borderRadius={"50%"}
                              border={
                                selectedDept?.id === item?.id
                                  ? "5px solid"
                                  : "none"
                              }
                              borderColor={"purple"}
                              transition={"border 0.2s ease"}
                            />
                            <Text
                              fontSize={"sm"}
                              color={"gray.800"}
                              fontWeight={500}
                            >
                              {item.title}
                            </Text>
                          </Flex>
                        </Box>
                      </SwiperSlide>
                    ))}
              </Swiper>
            </Box>
          </Box>
          <Box
            p={2}
            mt={4}
            bg={"#fff"}
            borderRadius={8}
            boxShadow={"0 0 10px rgba(0, 0, 0, 0.15)"}
          >
            <Flex align={"center"} justify={"space-between"} mb={2}>
              {" "}
              <Text fontSize={["sm", "md"]} color={"gray.800"} fontWeight={500}>
                Doctors
              </Text>
            </Flex>
            <Box>
              {data?.length ? (
                <Grid
                  templateColumns={{
                    base: "repeat(1, 1fr)",
                    md: "repeat(1, 1fr)",
                    lg: "repeat(2, 1fr)",
                  }}
                  gap={6}
                >
                  {data?.map((item) => (
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
                        <Divider my={2} />
                      </Box>
                    </GridItem>
                  ))}
                </Grid>
              ) : (
                <NotAvailable name={"Doctors"} />
              )}
            </Box>
          </Box>
        </ModalBody>
        <ModalFooter px={2}>
          <Button
            colorScheme="green"
            mr={3}
            type="submit" // Use form submission by default
            w={"100%"}
            size={"sm"}
          >
            Search
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const Overlay = () => (
  <ModalOverlay
    bg="blackAlpha.100"
    backdropFilter="blur(5px) hue-rotate(0deg)"
  />
);

export default Search;
