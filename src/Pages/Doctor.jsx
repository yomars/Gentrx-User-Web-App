/* eslint-disable react/prop-types */
// @ts-nocheck
import {
  Alert,
  AlertIcon,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  IconButton,
  Text, VStack,
  Link
} from "@chakra-ui/react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { GET } from "../Controllers/ApiControllers";
import { useQuery } from "@tanstack/react-query";
import Loading from "../Components/Loading";
import imageBaseURL from "../Controllers/image";
import { BiCalendar } from "react-icons/bi";
import {
  FaInstagram,
  FaFacebook,
  FaTwitter,
  FaYoutube,
  FaUserAlt,
} from "react-icons/fa";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MdHandshake } from "react-icons/md";
import { BsFillCameraVideoFill, BsHospitalFill } from "react-icons/bs";
import { GrEmergency } from "react-icons/gr";
import RatingStars from "../Hooks/RatingStars";
import user from "../Controllers/user";
import currency from "../Controllers/currency";
import DoctorReviews from "../Components/DoctorReviews";
import { EmailIcon, PhoneIcon } from "@chakra-ui/icons";
import { ImLocation } from "react-icons/im";
import GlightBoxSwiper from "./GlightBoxSwiper";

const feeData = [
  {
    id: 1,
    title: "OPD",
    fee: 400,
    service_charge: 0,
    created_at: "2024-01-28 12:39:29",
    updated_at: "2024-08-10 13:29:27",
  },
  {
    id: 2,
    title: "Video Consultant",
    fee: 250,
    service_charge: 20,
    created_at: "2024-01-28 12:40:11",
    updated_at: "2024-01-28 12:40:11",
  },
  {
    id: 3,
    title: "Emergency",
    fee: 500,
    service_charge: 30,
    created_at: "2024-01-28 12:40:11",
    updated_at: "2024-08-10 13:29:39",
  },
];

export default function Doctor() {
  const { id } = useParams();
  const [open, setOpen] = useState(false);
  const [doctor, setdoctor] = useState();
  const [appointmentType, setappointmentType] = useState();
  const navigate = useNavigate();
  const location = useLocation();

  const getData = async () => {
    const res = await GET(`get_doctor/${id}`);
    return res.data;
  };
  const { isLoading, data } = useQuery({
    queryKey: ["Doctor", id],
    queryFn: getData,
  });

  //

  const isDisableTypeButton = (ID, doc) => {
    switch (ID) {
      case 1:
        return doc.video_appointment;
      case 2:
        return doc.clinic_appointment;
      case 3:
        return doc.emergency_appointment;
      default:
        return "Unknown Step";
    }
  };

  const getfee = (type, doc) => {
    switch (type) {
      case "OPD":
        return doc.opd_fee;
      case "Video Consultant":
        return doc.video_fee;
      case "Emergency":
        return doc.emg_fee;
      default:
        return doc.emg_fee;
    }
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${data?.clinic_latitude},${data?.clinic_longitude}`;

  if (isLoading) return <Loading />;
  return (
    <Box>
      <Box bg={"primary.main"} p={0} py={{ base: "5", md: "10" }}>
        <Box className="container">
          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 32, md: 48 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Doctor Profile
          </Text>
        </Box>
      </Box>{" "}
      <Box className="container" minH={"80vh"}>
        <Flex justify={"center"}>
          {" "}
          <Box
            p={[2, 4, 5]}
            shadow="lg"
            borderWidth="1px"
            borderRadius="lg"
            mx="auto"
            bg="white"
            mt={5}
            w={600}
            maxW={"100vw"}
          >
            <Flex alignItems="center" mb={5} gap={5}>
              <Avatar
                borderRadius={8}
                size="2xl"
                src={`${imageBaseURL}/${data.image}`}
                fallbackSrc="https://via.placeholder.com/150"
              />
              <Box>
                <Text fontSize={["lg", "xl"]} fontWeight="bold">
                  {data.f_name} {data.l_name}
                </Text>
                <Text
                  fontWeight={700}
                  color={"primary.text"}
                  fontSize={["md", "lg"]}
                >
                  {data.department_name}
                </Text>
                <Text
                  fontWeight={600}
                  color={"gray.600"}
                  fontSize={["sm", "sm"]}
                >
                  {data.specialization}
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
                  {data.ex_year}+ Years Of Experience
                </Text>
                <Text
                  as={"span"}
                  display={"flex"}
                  gap={1}
                  alignItems={"center"}
                >
                  <RatingStars rating={data.average_rating} />{" "}
                  <Text
                    as={"span"}
                    mb={0}
                    color={"#000"}
                    fontSize={"xs"}
                    fontWeight={600}
                  >
                    {parseFloat(data.average_rating).toFixed(1)} (
                    {data.number_of_reviews})
                  </Text>
                </Text>
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
                      {data.total_appointment_done} Appointments Done
                    </Text>
                  </Text>
                </Flex>
              </Box>
            </Flex>
            <HStack spacing={1}>
              <IconButton
                cursor={"pointer"}
                as={Link}
                href={data.insta_link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                icon={<FaInstagram />}
                variant="ghost"
                colorScheme="pink"
              />{" "}
              <IconButton
                cursor={"pointer"}
                as="Link"
                href={data.fb_linik}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                icon={<FaFacebook />}
                variant="ghost"
                colorScheme="facebook"
              />
              <IconButton
                cursor={"pointer"}
                as="Link"
                href={data.twitter_link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                icon={<FaTwitter />}
                variant="ghost"
                colorScheme="twitter"
              />{" "}
              <IconButton
                cursor={"pointer"}
                as="Link"
                href={data.you_tube_link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                icon={<FaYoutube />}
                variant="ghost"
                colorScheme="red"
              />
            </HStack>
            <Divider my={2} />
            <Box>
              <VStack align="start" spacing={2}>
                {/* Clinic Name */}
                <Link
                  href={googleMapsUrl}
                  isExternal
                  display="flex"
                  alignItems="center"
                  color="gray.800"
                  fontWeight="600"
                  fontSize="sm"
                  _hover={{ color: "gray.500", textDecoration: "underline" }}
                >
                  <BsHospitalFill style={{ marginRight: "6px" }} />
                  {data.clinic_title}
                </Link>

                {/* Clinic Address */}
                <Link
                  href={googleMapsUrl}
                  isExternal
                  display="flex"
                  alignItems="center"
                  color="gray.800"
                  fontWeight="600"
                  fontSize="sm"
                  _hover={{ color: "gray.500", textDecoration: "underline" }}
                >
                  <ImLocation style={{ marginRight: "6px" }} />
                  <Text>{data.clinics_address}</Text>
                </Link>

                {/* Email */}
                <Link
                  href={`mailto:${data.clinic_email}`}
                  isExternal
                  display="flex"
                  alignItems="center"
                  color="gray.800"
                  fontWeight="600"
                  fontSize="sm"
                  _hover={{ color: "gray.500", textDecoration: "underline" }}
                >
                  <EmailIcon mr={2} />
                  {data.clinic_email}
                </Link>

                {/* Phone */}
                <Link
                  href={`tel:${data.clinic_phone}`}
                  isExternal
                  display="flex"
                  alignItems="center"
                  color="gray.800"
                  fontWeight="600"
                  fontSize="sm"
                  _hover={{ color: "gray.900", textDecoration: "underline" }}
                >
                  <PhoneIcon mr={2} />
                  {data.clinic_phone}
                </Link>
              </VStack>
            </Box>
            {/* images */}
            <Box>
              <GlightBoxSwiper clinic_images={data?.clinic_images} />
            </Box>
            {/* booking */}
            <Box>
              {" "}
              {data?.stop_booking === 1 || data.stop_booking === true ? (
                <Alert status="error" size={"xs"} py={1} px={1} mt={4}>
                  <AlertIcon />
                  <AlertTitle fontSize={"xs"}>
                    {" "}
                    Doctor Not Taking Appointments
                  </AlertTitle>
                </Alert>
              ) : null}
              {data?.clinic_stop_booking === 1 ||
              data.clinic_stop_booking === true ? (
                <Alert status="error" size={"xs"} py={1} px={1} mt={4}>
                  <AlertIcon />
                  <AlertTitle fontSize={"xs"}>
                    {" "}
                    Clinic is Not Scheduling Appointments at This Time
                  </AlertTitle>
                </Alert>
              ) : null}
              <Button
                mt={5}
                colorScheme="green"
                w={"100%"}
                size={"sm"}
                leftIcon={<BiCalendar />}
                onClick={() => {
                  if (user) {
                    setdoctor(data);
                    setOpen(!open);
                  } else {
                    navigate(`/login?ref=${location.pathname}`);
                  }
                }}
                isDisabled={
                  data?.stop_booking === 1 ||
                  data.stop_booking === true ||
                  data?.clinic_stop_booking === 1 ||
                  data.clinic_stop_booking === true
                }
              >
                Make Appointment
              </Button>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box mt={2}>
                      <Text fontSize={14} fontWeight={600}>
                        Select Appointment Type
                      </Text>
                      <Flex gap={3} mt={2}>
                        {feeData.map((fee) => (
                          <Box
                            key={fee.id}
                            padding={4}
                            borderRadius={8}
                            minW={100}
                            color={
                              appointmentType?.id === fee.id
                                ? "#fff"
                                : isDisableTypeButton(fee?.id, data) === 1
                                ? "#fff"
                                : "#fff"
                            }
                            bg={
                              appointmentType?.id === fee.id
                                ? "primary.text"
                                : isDisableTypeButton(fee?.id, data) === 1
                                ? "primary.bg"
                                : "gray.300"
                            }
                            cursor={
                              isDisableTypeButton(fee?.id, data) === 1
                                ? "pointer"
                                : "not-allowed"
                            }
                            onClick={(e) => {
                              if (isDisableTypeButton(fee?.id, data) === 0) {
                                e.stopPropagation();
                                return;
                              }
                              e.stopPropagation();
                              setappointmentType(
                                appointmentType?.id === fee?.id ? null : fee
                              );
                              navigate(
                                `/book-appointment/${doctor.user_id}/${fee.id}`
                              );
                            }}
                          >
                            {fee.id == 1 ? (
                              <MdHandshake fontSize={28} />
                            ) : fee.id == 2 ? (
                              <BsFillCameraVideoFill fontSize={28} />
                            ) : fee.id == 3 ? (
                              <GrEmergency fontSize={28} />
                            ) : null}
                            <Text
                              mt={5}
                              fontSize={{ base: "12px", md: "13px" }}
                              fontWeight={500}
                              m={0}
                            >
                              {fee.id === 2 ? "Video Call" : fee.title}
                            </Text>
                            <Text
                              mt={5}
                              fontSize={{ base: "12px", md: "13px" }}
                              fontWeight={500}
                              m={0}
                            >
                              {getfee(fee.title, data)} {currency}
                            </Text>
                          </Box>
                        ))}
                      </Flex>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
            {/* divider */}
            <Divider my={4} />
            <DoctorReviews id={id} />
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}
