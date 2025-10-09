/* eslint-disable react/prop-types */
// @ts-nocheck
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Divider,
  Flex,
  Text,
  VStack,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import { GET } from "../Controllers/ApiControllers";
import { useQuery } from "@tanstack/react-query";
import Loading from "../Components/Loading";
import GlightBoxSwiper from "./GlightBoxSwiper";
import { EmailIcon, PhoneIcon } from "@chakra-ui/icons";
import imageBaseURL from "../Controllers/image";
import NotAvailable from "../Components/NotAvailable";
import { FaWhatsapp, FaAmbulance, FaMapMarkedAlt } from "react-icons/fa";
import { MdPhone } from "react-icons/md";
import DoctorsByClinic from "../Components/DoctorsByClinic";
import ClinicTestimonials from "../Components/ClinicTestimonials";

export default function Doctor() {
  const { id } = useParams();
  const getData = async () => {
    const res = await GET(`get_clinic/${id}`);
    return res.data;
  };
  const { isLoading, data } = useQuery({
    queryKey: ["Doctor", id],
    queryFn: getData,
  });

  const openNavigation = () => {
    const url = `https://www.google.com/maps?q=${data?.latitude},${data?.longitude}`;
    window.open(url, "_blank");
  };

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
            Clinic
          </Text>
        </Box>
      </Box>{" "}
      <Box className="container" mt={0} pb={10}>
        {" "}
        <Flex gap={10} flexDir={{ base: "column", md: "row" }}>
          <Box
            p={[2, 4, 5]}
            shadow="lg"
            borderWidth="1px"
            borderRadius="lg"
            mx="auto"
            bg="white"
            mt={5}
            w={{ base: "100%", md: "40%" }}
            maxW={"100vw"}
          >
            <Text
              fontSize={["lg", "xl"]}
              fontWeight="bold"
              textAlign={"center"}
              color={"gray.600"}
            >
              Clinic Details
            </Text>
            {data?.stop_booking == 1 ? (
              <>
                {" "}
                <Divider my={3} />
                <Alert
                  status="warning"
                  borderRadius="md"
                  mb={4}
                  alignItems="start"
                >
                  <AlertIcon />
                  <Box>
                    {" "}
                    <AlertTitle>Appointments Closed!</AlertTitle>
                    <AlertDescription>
                      This clinic/hospital is not accepting appointments at the
                      moment.
                    </AlertDescription>
                  </Box>
                </Alert>
              </>
            ) : null}
            <Divider my={3} />
            <Flex alignItems="center" mb={5} gap={5}>
              <Avatar
                borderRadius={8}
                size="2xl"
                src={`${imageBaseURL}/${data.image}`}
                fallbackSrc="https://via.placeholder.com/150"
              />
              <Box>
                <Text fontSize={["lg", "xl"]} fontWeight="bold">
                  {data.title} {/* Dynamic Title */}
                </Text>
                <Text
                  fontWeight={600}
                  color={"gray.700"}
                  fontSize={["sm", "sm"]}
                  cursor={"pointer"}
                  onClick={() => {}}
                >
                  {data.address} {/* Dynamic Description */}
                </Text>
                <Text
                  fontWeight={600}
                  color={"gray.600"}
                  fontSize={["sm", "sm"]}
                >
                  {data.city_title}, {data.state_title} {/* Dynamic Location */}
                </Text>
                {data?.ambulance_btn_enable === "true" ||
                  data?.ambulance_btn_enable === true ||
                  (data?.ambulance_btn_enable === 1 && (
                    <Button
                      size={{ base: "sm", md: "sm" }}
                      colorScheme={"red"}
                      rightIcon={<FaAmbulance fontSize={20} />}
                      w={"full"}
                      as={"a"}
                      href={`tel:${data.ambulance_number}`}
                      mt={2}
                    >
                      Call Ambulance
                    </Button>
                  ))}
              </Box>
            </Flex>
            <Button
              leftIcon={<FaMapMarkedAlt />}
              colorScheme="green"
              size="sm"
              onClick={openNavigation}
              w={"100%"}
            >
              Navigate to Clinic
            </Button>
            <Divider my={2} />

            {data?.description?.length > 10 && (
              <Text
                fontWeight={600}
                color={"gray.600"}
                fontSize={["sm", "sm"]}
                textAlign={"justify"}
              >
                {data.description}
              </Text>
            )}

            <Divider my={2} />
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={3}>
                Clinic Images -
              </Text>
              {data?.clinic_images && data?.clinic_images.length ? (
                <GlightBoxSwiper clinic_images={data?.clinic_images} />
              ) : (
                <NotAvailable text={"Clinic images not available"} />
              )}
            </Box>
            <Divider my={4} />
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={3}>
                Contact Details -
              </Text>

              <ContactDetails data={data} />
            </Box>
            <Divider my={4} />
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={3}>
                Opening Hours
              </Text>
              {data?.opening_hours ? (
                <VStack align="start" spacing={2}>
                  {Object.entries(JSON.parse(data.opening_hours)).map(
                    ([day, hours]) => (
                      <Flex
                        key={day}
                        width="100%"
                        justifyContent="space-between"
                      >
                        <Text fontWeight="600" textTransform="capitalize">
                          {day}:
                        </Text>
                        <Text
                          fontWeight={600}
                          color={
                            hours === "eeee" || hours === null || hours === ""
                              ? "red.500"
                              : "gray.500"
                          }
                        >
                          {hours === "eeee" || hours === null || hours === ""
                            ? "Closed"
                            : hours}
                        </Text>
                      </Flex>
                    )
                  )}
                </VStack>
              ) : (
                <NotAvailable text={"opening hours not available"} />
              )}
            </Box>
            <Divider my={4} />
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={3}>
                Testimonials
              </Text>
              <ClinicTestimonials clinicId={id} />
            </Box>
          </Box>
          <Box
            p={[2, 4, 4]}
            shadow="lg"
            borderWidth="1px"
            borderRadius="lg"
            mx="auto"
            bg="white"
            mt={5}
            w={{ base: "100%", md: "60%" }}
            maxW={"100vw"}
            maxH={"fit-content"}
          >
            <Text
              fontSize={["lg", "xl"]}
              fontWeight="bold"
              textAlign={"center"}
              color={"gray.600"}
            >
              Doctors Available in {data.title}
            </Text>
            <Divider my={3} />
            <DoctorsByClinic clinicID={data.id} clinicName={data?.title} />
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}

const ContactDetails = ({ data }) => {
  const contactMethods = [
    {
      type: "email",
      icon: EmailIcon,
      href: `mailto:${data.email}`,
      value: data.email,
      show: true,
    },
    {
      type: "phone",
      icon: PhoneIcon,
      href: `tel:${data.phone}`,
      value: data.phone,
      show: true,
    },
    {
      type: "whatsapp",
      icon: FaWhatsapp,
      href: `https://wa.me/${data.whatsapp}`,
      value: data.whatsapp,
      show: true,
    },
    {
      type: "ambulance_number",
      icon: FaAmbulance,
      href: `tel:${data.ambulance_number}`,
      value: data.ambulance_number,
      show:
        data.ambulance_btn_enable === true || data.ambulance_btn_enable === 1,
    },
    {
      type: "phone_second",
      icon: MdPhone,
      href: `tel:${data.phone_second}`,
      value: data.phone_second,
      show: true,
    },
  ];

  return (
    <VStack align="start" spacing={2}>
      {contactMethods
        .filter((item) => item.show)
        .map(({ type, icon: Icon, href, value }) =>
          value ? (
            <Box
              as={ChakraLink}
              key={type}
              href={href}
              isExternal
              display="flex"
              alignItems="center"
              color="gray.600"
              fontWeight="600"
              fontSize="sm"
              _hover={{ color: "gray.700", textDecoration: "underline" }}
              fontFamily={"Quicksand, sans-serif"}
            >
              <Icon
                style={{ marginRight: "8px", fontSize: "16px" }}
                fontSize={"lg"}
              />
              {value}
            </Box>
          ) : null
        )}
    </VStack>
  );
};
