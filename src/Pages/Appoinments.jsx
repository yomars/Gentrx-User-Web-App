import { AiOutlineArrowRight } from "react-icons/ai";
/* eslint-disable react/prop-types */
import {
  Box,
  Text,
  VStack,
  Badge,
  Flex,
  Button,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spacer,
} from "@chakra-ui/react";
import Loading from "../Components/Loading";
import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import user from "../Controllers/user";
import {
  FaCheckCircle,
  FaClock,
  FaListAlt,
  FaTimesCircle,
} from "react-icons/fa";
import {
  FaHourglassHalf,
  FaCheck,
  FaTimes,
  FaCalendarAlt,
  FaUserCheck,
} from "react-icons/fa";

import { useState } from "react";
import { motion } from "framer-motion";
import moment from "moment";
import { Link, useNavigate } from "react-router-dom";
import ErrorPage from "./ErrorPage";
import getStatusBadge from "../Hooks/StatusBadge";
import { BiCalendar } from "react-icons/bi";

const steps = [
  {
    Name: "All",
    step: 1,
    icon: <FaListAlt />,
  },
  {
    Name: "Upcoming",
    step: 2,
    icon: <FaClock />,
  },
  {
    Name: "Pending",
    step: 3,
    icon: <FaHourglassHalf />,
  },
  {
    Name: "Confirmed",
    step: 4,
    icon: <FaCheck />,
  },
  {
    Name: "Rejected",
    step: 5,
    icon: <FaTimes />,
  },
  {
    Name: "Completed",
    step: 6,
    icon: <FaCheckCircle />,
  },
  {
    Name: "Rescheduled",
    step: 7,
    icon: <FaCalendarAlt />,
  },
  {
    Name: "Cancelled",
    step: 8,
    icon: <FaTimesCircle />,
  },
  {
    Name: "Visited",
    step: 9,
    icon: <FaUserCheck />,
  },
];

const AppointmentCard = ({ appointment }) => {
  const navigate = useNavigate();
  const getFormattedDate = (dateString) => {
    const date = moment(dateString, "YYYY-MM-DD");
    return {
      month: date.format("MMM"),
      date: date.format("DD"),
      year: date.format("YYYY"),
    };
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="md"
      p={{ base: "2", md: "2" }}
      bg="white"
      width="100%"
      mb={6}
      minW={"100%"}
      cursor={"pointer"}
      py={{ base: 4, md: 2 }}
      onClick={() => {
        navigate(`/appointment/${appointment.id}`);
      }}
      pos={"relative"}
    >
      <Flex align="center" gap={2} justify={"space-between"}>
        <Box flex={1}>
          {" "}
          <Text
            fontSize="md"
            fontWeight="bold"
            color="gray.800"
            textAlign={"center"}
          >
            {getFormattedDate(appointment.date).month}
          </Text>
          <Text
            fontSize="3xl"
            fontWeight="700"
            color="green.600"
            textAlign={"center"}
          >
            {getFormattedDate(appointment.date).date}
          </Text>
          <Text
            fontSize="md"
            fontWeight="bold"
            color="gray.800"
            textAlign={"center"}
          >
            {getFormattedDate(appointment.date).year}
          </Text>
        </Box>
        <Box flex={5}>
          {" "}
          <Box>
            {" "}
            <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>
              Name: {appointment.patient_f_name} {appointment.patient_l_name} ,
              ID - #{appointment.id}
            </Text>
            <Text
              fontWeight="bold"
              fontSize={{ base: "sm", md: "sm" }}
              color={"gray.700"}
            >
              Time -{" "}
              {moment(appointment.time_slots, "hh:mm:ss").format("hh:mm A")}
            </Text>
            <Badge
              mb={1}
              colorScheme={appointment.type === "Emergency" ? "red" : "green"}
              fontSize={{ base: "xs", md: "xs" }}
            >
              {appointment.type}
            </Badge>
          </Box>{" "}
          {getStatusBadge(appointment.status)}
          <Divider my={1} />
          <Text
            fontWeight="bold"
            fontSize={{ base: "sm", md: "sm" }}
            color={"gray.700"}
          >
            Doctor - {appointment.doct_f_name} {appointment.doct_l_name}
          </Text>
          <Text
            fontWeight="bold"
            fontSize={{ base: "sm", md: "sm" }}
            color={"gray.700"}
          >
            {appointment.dept_title}
          </Text>
        </Box>

        <VStack align="end" spacing={1} flex={2}>
          <Button
            colorScheme="green"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/doctor/${appointment.doct_id}`);
            }}
          >
            Rebook <Spacer mx={1} /> <AiOutlineArrowRight />
          </Button>
        </VStack>
      </Flex>
    </Box>
  );
};

const Appointments = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const getData = async () => {
    const res = await GET(`get_appointments?user_id=${user.id}`);
    return res.data;
  };

  const { isLoading, data, error } = useQuery({
    queryKey: ["appointments"],
    queryFn: getData,
  });

  const filterData = (appointments, filter) => {
    const today = new Date();

    return appointments
      .filter((appointment) => {
        const appointmentDate = new Date(appointment.date);

        switch (filter) {
          case 1: // All
            return true; // Show all appointments
          case 2: // Upcoming
            return (
              appointmentDate > today &&
              appointment.status !== "Completed" &&
              appointment.status !== "Cancelled" &&
              appointment.status !== "Rejected"
            );
          case 3: // Pending
            return appointment.status === "Pending";
          case 4: // Confirmed
            return appointment.status === "Confirmed";
          case 5: // Rejected
            return appointment.status === "Rejected";
          case 6: // Completed
            return appointment.status === "Completed";
          case 7: // Rescheduled
            return appointment.status === "Rescheduled";
          case 8: // Cancelled
            return appointment.status === "Cancelled";
          case 9: // Visited
            return appointment.status === "Visited";
          default:
            return true; // Default case to show all if no valid filter
        }
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;
  const filteredData = filterData(data, currentStep);
  return (
    <Box>
      {" "}
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "10" }}>
        <Box className="container">
          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 24, md: 32 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Appointments
          </Text>
        </Box>
      </Box>{" "}
      <div className="container">
        <Flex justify={"center"}>
          <Box maxW={"100vw"} w={"700px"} minH={"80vh"} px={2}>
            {!data.length ? (
              <Box mt={5}>
                <Alert status="error">
                  <AlertIcon />
                  <AlertTitle>Appointments Not Found!</AlertTitle>
                </Alert>
                <Button
                  mt={5}
                  colorScheme="green"
                  w={"100%"}
                  size={"sm"}
                  leftIcon={<BiCalendar />}
                  as={Link}
                  to={"/doctors"}
                >
                  Make Appointment
                </Button>
              </Box>
            ) : (
              <Flex gap={5} mt={5} flexDir={{ base: "column", md: "row" }}>
                <Box
                  overflowX={"scroll"}
                  w={{ base: "100%", md: "30%" }}
                  border={"1px solid"}
                  borderColor={"gray.200"}
                  borderRadius={4}
                  bg={"#FFF"}
                  h={"fit-content"}
                  sx={{
                    "&::-webkit-scrollbar": {
                      display: "none", // Hide scrollbar for WebKit browsers
                    },
                    scrollbarWidth: "none", // Hide scrollbar for Firefox
                    msOverflowStyle: "none", // Hide scrollbar for IE and Edge
                  }}
                >
                  <Box
                    w={{ base: "fit-content", md: "100%" }}
                    p={4}
                    bg={"#fff"}
                    h={"fit-content"}
                    display={{ base: "flex", md: "block" }}
                    justifyContent={{ base: "space-between" }}
                    gap={{ base: 5 }}
                  >
                    {steps.map((item) => (
                      <Flex
                        key={item.Name}
                        align={"center"}
                        gap={2}
                        mb={3}
                        cursor={"pointer"}
                        onClick={() => {
                          setCurrentStep(item.step);
                        }}
                        transition={"0.3s ease"}
                        flexDir={{ base: "column", md: "row" }}
                      >
                        <Box
                          p={2}
                          border={"1px solid"}
                          borderColor={
                            currentStep === item.step
                              ? "primary.text"
                              : "gray.200"
                          }
                          borderRadius={4}
                          fontSize={18}
                          color={
                            currentStep === item.step ? "#fff" : "gray.600"
                          }
                          bg={
                            currentStep === item.step
                              ? "primary.text"
                              : "transparent"
                          }
                          transition={"0.3s ease"}
                        >
                          {item.icon}
                        </Box>
                        <Text
                          fontSize={14}
                          fontWeight={currentStep === item.step ? "700" : "600"}
                          color={
                            currentStep === item.step
                              ? "primary.text"
                              : "gray.600"
                          }
                          transition={"0.3s ease"}
                        >
                          {item.Name}
                        </Text>
                      </Flex>
                    ))}
                  </Box>
                </Box>

                <VStack spacing={1} flex={2}>
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    style={{ minWidth: "100%" }}
                  >
                    {filteredData.length ? (
                      filteredData.map((appointment) => (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                        />
                      ))
                    ) : (
                      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
                        <Alert status="info" borderRadius="md" alignItems="start">
                          <AlertIcon mt={1} />
                          <Box>
                            <AlertTitle>No appointments in this view</AlertTitle>
                            <AlertDescription>
                              There are no appointments under the selected filter yet. Switch to All to review your full history or book a new visit.
                            </AlertDescription>
                          </Box>
                        </Alert>
                        <Flex gap={3} mt={4} wrap="wrap">
                          <Button size="sm" colorScheme="blue" onClick={() => setCurrentStep(1)}>
                            View All Appointments
                          </Button>
                          <Button size="sm" variant="outline" as={Link} to="/doctors">
                            Book Appointment
                          </Button>
                        </Flex>
                      </Box>
                    )}
                  </motion.div>
                </VStack>
              </Flex>
            )}{" "}
          </Box>
        </Flex>
      </div>
    </Box>
  );
};

export default Appointments;
