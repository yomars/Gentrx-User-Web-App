/* eslint-disable react/prop-types */
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
} from "@chakra-ui/react";
import imageBaseURL from "./../Controllers/image";
import "swiper/css";
import "swiper/css/pagination";
import Loading from "../Components/Loading";
import RatingStars from "../Hooks/RatingStars";
import { FaInstagram, FaFacebook, FaTwitter, FaYoutube } from "react-icons/fa";
import { Link } from "react-router-dom";
import ErrorPage from "./ErrorPage";
import { useCity } from "../Context/SelectedCity";
import { buildDoctorEndpoint } from "../lib/doctorQuery";

export default function DoctorsByDeptID({ deptID, deptName }) {
  const { selectedCity } = useCity();
  const getData = async () => {
    const endpoint = await buildDoctorEndpoint({
      selectedCity,
      department: deptID,
    });
    const res = await GET(endpoint);
    return res.data;
  };

  const { isLoading, data, error } = useQuery({
    queryKey: ["Doctors", deptID , selectedCity],
    queryFn: getData,
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;

  return (
    <Box>
      <Box mt={{ base: 0, md: 0 }} className="container" position={"relative"}>
        {data ? (
          <>
            {" "}
            <Box>
              <Box>
                <Grid
                  templateColumns={{
                    base: "repeat(1, 1fr)",
                    md: "repeat(2, 1fr)",
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
                                base: "14px",
                                md: "14px",
                                lg: "14px",
                              }}
                              fontWeight={600}
                              m={0}
                              color={"primary.text"}
                              fontFamily={"Quicksand, sans-serif"}
                            >
                              {item.department_name}
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
                          </Box>
                        </Flex>
                        <Divider my={2} />
                        <Flex justify={"space-between"}>
                          <Text
                            fontSize={12}
                            fontFamily={"Quicksand, sans-serif"}
                            fontWeight={600}
                            color={"gray.500"}
                          >
                            Total Rating
                            <Text
                              as={"span"}
                              display={"flex"}
                              gap={1}
                              alignItems={"center"}
                            >
                              <RatingStars rating={4.5} />{" "}
                              <Text as={"span"} mb={0} color={"#000"}>
                                4.5 (867)
                              </Text>
                            </Text>
                          </Text>
                          <Text
                            fontSize={12}
                            fontFamily={"Quicksand, sans-serif"}
                            fontWeight={600}
                            color={"gray.500"}
                          >
                            Total Experience
                            <Text
                              as={"span"}
                              display={"flex"}
                              gap={1}
                              alignItems={"center"}
                              fontSize={14}
                              color={"#000"}
                              fontWeight={700}
                            >
                              {item.ex_year}+ Years
                            </Text>
                          </Text>
                        </Flex>
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
                          />
                        </HStack>
                      </Box>
                    </GridItem>
                  ))}
                </Grid>
              </Box>
            </Box>
          </>
        ) : null}
        {isLoading ? (
          <>
            {" "}
            <Skeleton h={"100px"} w={"100%"} mt={5} />
          </>
        ) : null}
        {!data.length ? (
          <>
            {" "}
            <Text
              fontSize={16}
              textAlign={"justify"}
              mt={22}
              color={"gray.800"}
              fontWeight={500}
              display={"inline-block"}
            >
              We apologize for the inconvenience, but there are no doctors
              currently available in the{" "}
              <Text
                display={"inline-block"}
                fontWeight={600}
                color={"primary.text"}
              >
                {deptName}
              </Text>{" "}
              department. Please check back later or consider a different
              department. If you require immediate assistance, our support team
              is here to help you with any urgent concerns. Thank you for your
              understanding and patience.
            </Text>
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
