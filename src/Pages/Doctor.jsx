// @ts-nocheck
import {
  Alert,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Image,
  List,
  ListIcon,
  ListItem,
  Text,
  VStack,
  Link,
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
  FaCheckCircle,
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
import MobileAppSection from "../Components/MobileAppSection";

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

  // Parse accreditation — handle comma-separated string or JSON array
  const accreditationList = (() => {
    if (!data?.accreditation) return [];
    try {
      const parsed = JSON.parse(data.accreditation);
      return Array.isArray(parsed) ? parsed : [String(data.accreditation)];
    } catch {
      return String(data.accreditation)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  })();

  if (isLoading) return <Loading />;
  return (
    <Box>
      {/* ── Hero Banner ── */}
      <Box
        h={{ base: "180px", md: "280px" }}
        bgImage="url('/images/contact-hero.png')"
        bgSize="cover"
        bgPosition="center"
        position="relative"
      >
        <Box
          position="absolute"
          inset={0}
          bg="rgba(22, 101, 52, 0.60)"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text
            fontFamily="Quicksand, sans-serif"
            fontSize={{ base: 28, md: 44 }}
            fontWeight={700}
            color="#fff"
            textAlign="center"
            textShadow="0 2px 8px rgba(0,0,0,0.3)"
          >
            Doctor Profile
          </Text>
        </Box>
      </Box>

      {/* ── Profile Section ── */}
      <Box className="container" py={{ base: 6, md: 10 }}>
        <Text
          fontFamily="Quicksand, sans-serif"
          fontSize={{ base: "xl", md: "2xl" }}
          fontWeight={700}
          color="primary.text"
          mb={{ base: 6, md: 8 }}
        >
          Doctor's Profile Details
        </Text>

        <Grid
          templateColumns={{ base: "1fr", md: "1fr 2fr" }}
          gap={{ base: 6, md: 8 }}
          alignItems="start"
        >
          {/* ── LEFT COLUMN ── */}
          <GridItem>
            <Box
              borderRadius="xl"
              overflow="hidden"
              shadow="md"
              border="1px solid"
              borderColor="gray.100"
            >
              {/* Photo */}
              <Box w="100%" bg="gray.100" overflow="hidden">
                <Image
                  src={`${imageBaseURL}/${data.image}`}
                  alt={`${data.f_name} ${data.l_name}`}
                  w="100%"
                  objectFit="cover"
                  style={{ aspectRatio: "4 / 5" }}
                  fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='375' viewBox='0 0 300 375'%3E%3Crect width='300' height='375' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='14' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E"
                />
              </Box>

              {/* Name & credentials */}
              <Box px={5} pt={5} pb={3}>
                <Text fontSize="xl" fontWeight={700} color="gray.800">
                  {data.f_name} {data.l_name}
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight={600}
                  color="primary.text"
                  mt={0.5}
                >
                  {data.department_name}
                </Text>
                <Text fontSize="sm" color="gray.500" mt={0.5}>
                  {data.specialization}
                </Text>
                <Flex align="center" gap={2} mt={2}>
                  <RatingStars rating={data.average_rating} />
                  <Text fontSize="xs" fontWeight={600} color="gray.600">
                    {parseFloat(data.average_rating).toFixed(1)} (
                    {data.number_of_reviews})
                  </Text>
                </Flex>
                <Text fontSize="sm" fontWeight={600} color="gray.700" mt={1}>
                  {data.ex_year}+ Years of Experience
                </Text>
                <Text fontSize="xs" color="gray.500" mt={0.5}>
                  {data.total_appointment_done} Appointments Done
                </Text>
              </Box>

              {/* Social icons */}
              <HStack px={4} pb={3} spacing={1}>
                {data.insta_link && (
                  <IconButton
                    as={Link}
                    href={data.insta_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    icon={<FaInstagram />}
                    size="sm"
                    variant="ghost"
                    colorScheme="pink"
                  />
                )}
                {data.fb_linik && (
                  <IconButton
                    as={Link}
                    href={data.fb_linik}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    icon={<FaFacebook />}
                    size="sm"
                    variant="ghost"
                    colorScheme="facebook"
                  />
                )}
                {data.twitter_link && (
                  <IconButton
                    as={Link}
                    href={data.twitter_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                    icon={<FaTwitter />}
                    size="sm"
                    variant="ghost"
                    colorScheme="twitter"
                  />
                )}
                {data.you_tube_link && (
                  <IconButton
                    as={Link}
                    href={data.you_tube_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    icon={<FaYoutube />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                  />
                )}
              </HStack>

              {/* Accreditation */}
              {accreditationList.length > 0 && (
                <Box px={5} pb={5}>
                  <Divider mb={4} />
                  <Text
                    fontFamily="Quicksand, sans-serif"
                    fontSize="md"
                    fontWeight={700}
                    color="primary.text"
                    mb={3}
                  >
                    Accreditation
                  </Text>
                  <List spacing={2}>
                    {accreditationList.map((item, idx) => (
                      <ListItem
                        key={idx}
                        display="flex"
                        alignItems="flex-start"
                        fontSize="sm"
                        color="gray.700"
                      >
                        <ListIcon
                          as={FaCheckCircle}
                          color="primary.text"
                          mt={0.5}
                          flexShrink={0}
                        />
                        {item}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          </GridItem>

          {/* ── RIGHT COLUMN ── */}
          <GridItem>
            <VStack align="stretch" spacing={{ base: 6, md: 8 }}>
              {/* About Me */}
              {data.about && (
                <Box>
                  <Text
                    fontFamily="Quicksand, sans-serif"
                    fontSize={{ base: "lg", md: "xl" }}
                    fontWeight={700}
                    color="primary.text"
                    borderBottom="2px solid"
                    borderColor="primary.text"
                    pb={2}
                    mb={3}
                  >
                    About Me
                  </Text>
                  <Text
                    fontSize="sm"
                    color="gray.700"
                    lineHeight={1.9}
                    whiteSpace="pre-wrap"
                  >
                    {data.about}
                  </Text>
                </Box>
              )}

              {/* Specialty */}
              {data.specialization && (
                <Box>
                  <Text
                    fontFamily="Quicksand, sans-serif"
                    fontSize={{ base: "lg", md: "xl" }}
                    fontWeight={700}
                    color="primary.text"
                    borderBottom="2px solid"
                    borderColor="primary.text"
                    pb={2}
                    mb={3}
                  >
                    Specialty
                  </Text>
                  <Text fontSize="sm" color="gray.700" lineHeight={1.9}>
                    {data.specialization}
                  </Text>
                  {data.department_name && (
                    <Badge
                      colorScheme="green"
                      mt={2}
                      borderRadius="full"
                      px={3}
                    >
                      {data.department_name}
                    </Badge>
                  )}
                </Box>
              )}

              {/* Education */}
              {data.education && (
                <Box>
                  <Text
                    fontFamily="Quicksand, sans-serif"
                    fontSize={{ base: "lg", md: "xl" }}
                    fontWeight={700}
                    color="primary.text"
                    borderBottom="2px solid"
                    borderColor="primary.text"
                    pb={2}
                    mb={3}
                  >
                    Education
                  </Text>
                  <Text
                    fontSize="sm"
                    color="gray.700"
                    lineHeight={1.9}
                    whiteSpace="pre-wrap"
                  >
                    {data.education}
                  </Text>
                </Box>
              )}

              {/* Clinic Information */}
              <Box>
                <Text
                  fontFamily="Quicksand, sans-serif"
                  fontSize={{ base: "lg", md: "xl" }}
                  fontWeight={700}
                  color="primary.text"
                  borderBottom="2px solid"
                  borderColor="primary.text"
                  pb={2}
                  mb={3}
                >
                  Clinic Information
                </Text>
                <VStack align="start" spacing={2}>
                  <Link
                    href={googleMapsUrl}
                    isExternal
                    display="flex"
                    alignItems="center"
                    color="gray.700"
                    fontWeight="600"
                    fontSize="sm"
                    _hover={{ color: "primary.text" }}
                  >
                    <BsHospitalFill style={{ marginRight: "8px", flexShrink: 0 }} />
                    {data.clinic_title}
                  </Link>
                  <Link
                    href={googleMapsUrl}
                    isExternal
                    display="flex"
                    alignItems="center"
                    color="gray.700"
                    fontWeight="600"
                    fontSize="sm"
                    _hover={{ color: "primary.text" }}
                  >
                    <ImLocation style={{ marginRight: "8px", flexShrink: 0 }} />
                    {data.clinics_address}
                  </Link>
                  {data.clinic_email && (
                    <Link
                      href={`mailto:${data.clinic_email}`}
                      isExternal
                      display="flex"
                      alignItems="center"
                      color="gray.700"
                      fontWeight="600"
                      fontSize="sm"
                      _hover={{ color: "primary.text" }}
                    >
                      <EmailIcon mr={2} />
                      {data.clinic_email}
                    </Link>
                  )}
                  {data.clinic_phone && (
                    <Link
                      href={`tel:${data.clinic_phone}`}
                      isExternal
                      display="flex"
                      alignItems="center"
                      color="gray.700"
                      fontWeight="600"
                      fontSize="sm"
                      _hover={{ color: "primary.text" }}
                    >
                      <PhoneIcon mr={2} />
                      {data.clinic_phone}
                    </Link>
                  )}
                </VStack>
              </Box>

              {/* Clinic Images */}
              {data?.clinic_images && (
                <Box>
                  <GlightBoxSwiper clinic_images={data.clinic_images} />
                </Box>
              )}

              {/* Booking */}
              <Box>
                {data?.stop_booking === 1 || data.stop_booking === true ? (
                  <Alert status="error" size="xs" py={1} px={1} mb={3}>
                    <AlertIcon />
                    <AlertTitle fontSize="xs">
                      Doctor Not Taking Appointments
                    </AlertTitle>
                  </Alert>
                ) : null}
                {data?.clinic_stop_booking === 1 ||
                data.clinic_stop_booking === true ? (
                  <Alert status="error" size="xs" py={1} px={1} mb={3}>
                    <AlertIcon />
                    <AlertTitle fontSize="xs">
                      Clinic is Not Scheduling Appointments at This Time
                    </AlertTitle>
                  </Alert>
                ) : null}
                <Button
                  colorScheme="green"
                  size="md"
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
                      <Box mt={4}>
                        <Text fontSize={14} fontWeight={600}>
                          Select Appointment Type
                        </Text>
                        <Flex gap={3} mt={2} flexWrap="wrap">
                          {feeData.map((fee) => (
                            <Box
                              key={fee.id}
                              padding={4}
                              borderRadius={8}
                              minW={100}
                              color="#fff"
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
                              {fee.id === 1 ? (
                                <MdHandshake fontSize={28} />
                              ) : fee.id === 2 ? (
                                <BsFillCameraVideoFill fontSize={28} />
                              ) : fee.id === 3 ? (
                                <GrEmergency fontSize={28} />
                              ) : null}
                              <Text
                                fontSize={{ base: "12px", md: "13px" }}
                                fontWeight={500}
                                mt={5}
                                m={0}
                              >
                                {fee.id === 2 ? "Video Call" : fee.title}
                              </Text>
                              <Text
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
            </VStack>
          </GridItem>
        </Grid>

        {/* Reviews */}
        <Box mt={{ base: 8, md: 12 }}>
          <DoctorReviews id={id} />
        </Box>
      </Box>

      {/* Mobile App Section */}
      <MobileAppSection />
    </Box>
  );
}
