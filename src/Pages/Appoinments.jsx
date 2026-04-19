/* eslint-disable react/prop-types */
import {
  Box,
  Text,
  Badge,
  Flex,
  Button,
  Icon,
  Avatar,
  HStack,
  VStack,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
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
  FaHourglassHalf,
  FaCheck,
  FaTimes,
  FaCalendarAlt,
  FaUserCheck,
  FaUserMd,
  FaCalendarPlus,
  FaChevronRight,
  FaStethoscope,
} from "react-icons/fa";
import { MdOutlineAccessTime, MdLocalHospital } from "react-icons/md";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import { Link, useNavigate } from "react-router-dom";
import ErrorPage from "./ErrorPage";

const STATUS_CONFIG = {
  Pending:     { color: "#F59E0B", bg: "#FFFBEB", border: "#F59E0B", label: "Pending" },
  Confirmed:   { color: "#10B981", bg: "#ECFDF5", border: "#10B981", label: "Confirmed" },
  Completed:   { color: "#6366F1", bg: "#EEF2FF", border: "#6366F1", label: "Completed" },
  Rejected:    { color: "#EF4444", bg: "#FEF2F2", border: "#EF4444", label: "Rejected" },
  Cancelled:   { color: "#6B7280", bg: "#F9FAFB", border: "#6B7280", label: "Cancelled" },
  Rescheduled: { color: "#3B82F6", bg: "#EFF6FF", border: "#3B82F6", label: "Rescheduled" },
  Visited:     { color: "#04500d", bg: "#f0fdf4", border: "#04500d", label: "Visited" },
};

const FILTERS = [
  { name: "All",         step: 1, icon: FaListAlt },
  { name: "Upcoming",    step: 2, icon: FaClock },
  { name: "Pending",     step: 3, icon: FaHourglassHalf },
  { name: "Confirmed",   step: 4, icon: FaCheck },
  { name: "Rejected",    step: 5, icon: FaTimes },
  { name: "Completed",   step: 6, icon: FaCheckCircle },
  { name: "Rescheduled", step: 7, icon: FaCalendarAlt },
  { name: "Cancelled",   step: 8, icon: FaTimesCircle },
  { name: "Visited",     step: 9, icon: FaUserCheck },
];

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { color: "#6B7280", bg: "#F9FAFB", label: status };
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      px={2}
      py={0.5}
      borderRadius="full"
      bg={cfg.bg}
      border={`1px solid ${cfg.color}`}
    >
      <Box w={1.5} h={1.5} borderRadius="full" bg={cfg.color} mr={1.5} />
      <Text fontSize="xs" fontWeight={600} color={cfg.color}>{cfg.label}</Text>
    </Box>
  );
};

const AppointmentCard = ({ appointment }) => {
  const navigate = useNavigate();
  const status = appointment.status || "Pending";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  const apptDate = moment(appointment.date, "YYYY-MM-DD");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
      style={{ width: "100%" }}
    >
      <Box
        bg="white"
        borderRadius="16px"
        overflow="hidden"
        mb={3}
        cursor="pointer"
        onClick={() => navigate(`/appointment/${appointment.id}`)}
        boxShadow="0 1px 4px rgba(0,0,0,0.07)"
        border="1px solid"
        borderColor="gray.100"
        _hover={{ boxShadow: "0 4px 16px rgba(4,80,13,0.12)", transform: "translateY(-1px)" }}
        transition="all 0.18s ease"
        position="relative"
      >
        {/* Status stripe */}
        <Box
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          w="4px"
          bg={cfg.color}
          borderRadius="16px 0 0 16px"
        />

        <Flex p={4} pl={5} gap={4} align="stretch">
          {/* Date block */}
          <Box
            flexShrink={0}
            bg={`${cfg.bg}`}
            border={`1.5px solid ${cfg.color}22`}
            borderRadius="12px"
            w="60px"
            display="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="center"
            py={2}
          >
            <Text fontSize="10px" fontWeight={700} color={cfg.color} textTransform="uppercase" letterSpacing="0.08em">
              {apptDate.format("MMM")}
            </Text>
            <Text fontSize="26px" fontWeight={800} color={cfg.color} lineHeight={1} my={0.5}>
              {apptDate.format("DD")}
            </Text>
            <Text fontSize="10px" fontWeight={600} color="gray.400">
              {apptDate.format("YYYY")}
            </Text>
          </Box>

          {/* Main info */}
          <Box flex={1} minW={0}>
            <Flex align="center" justify="space-between" mb={1} wrap="wrap" gap={1}>
              <Text fontSize="sm" fontWeight={700} color="gray.800" noOfLines={1}>
                {appointment.patient_f_name} {appointment.patient_l_name}
              </Text>
              <StatusBadge status={status} />
            </Flex>

            <HStack spacing={3} mb={1.5} flexWrap="wrap">
              <HStack spacing={1}>
                <Icon as={MdOutlineAccessTime} color="gray.400" boxSize={3.5} />
                <Text fontSize="xs" color="gray.500" fontWeight={500}>
                  {moment(appointment.time_slots, "HH:mm:ss").format("h:mm A")}
                </Text>
              </HStack>
              <HStack spacing={1}>
                <Icon as={FaStethoscope} color="gray.400" boxSize={3} />
                <Text fontSize="xs" color="gray.500" fontWeight={500}>
                  {appointment.doct_f_name} {appointment.doct_l_name}
                </Text>
              </HStack>
            </HStack>

            <HStack spacing={3} flexWrap="wrap">
              <HStack spacing={1}>
                <Icon as={MdLocalHospital} color="gray.400" boxSize={3.5} />
                <Text fontSize="xs" color="gray.500">{appointment.dept_title}</Text>
              </HStack>
              <Badge
                colorScheme={appointment.type === "Emergency" ? "red" : "green"}
                fontSize="10px"
                borderRadius="full"
                px={2}
              >
                {appointment.type}
              </Badge>
            </HStack>
          </Box>

          {/* Right arrow */}
          <Flex align="center" flexShrink={0}>
            <Box
              bg="gray.50"
              borderRadius="full"
              p={1.5}
              _groupHover={{ bg: "green.50" }}
            >
              <Icon as={FaChevronRight} color="gray.300" boxSize={3} />
            </Box>
          </Flex>
        </Flex>

        {/* Footer: Rebook */}
        <Box px={5} pb={3} pt={0}>
          <Divider mb={2.5} />
          <Flex justify="space-between" align="center">
            <Text fontSize="11px" color="gray.400" fontWeight={500}>
              #{appointment.id}
              {appointment.booking_number ? ` · ${appointment.booking_number}` : ""}
            </Text>
            <Button
              size="xs"
              colorScheme="green"
              variant="outline"
              borderRadius="full"
              leftIcon={<FaCalendarPlus />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/doctor/${appointment.doct_id}`);
              }}
            >
              Rebook
            </Button>
          </Flex>
        </Box>
      </Box>
    </motion.div>
  );
};

const EmptyState = ({ filtered, onReset }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.25 }}
  >
    <Box
      bg="white"
      borderRadius="20px"
      p={10}
      textAlign="center"
      border="1.5px dashed"
      borderColor="gray.200"
    >
      <Box
        w={16}
        h={16}
        bg="green.50"
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        mx="auto"
        mb={4}
      >
        <Icon as={FaCalendarAlt} color="green.500" boxSize={7} />
      </Box>
      <Text fontSize="lg" fontWeight={700} color="gray.700" mb={1}>
        {filtered ? "No appointments in this view" : "No appointments yet"}
      </Text>
      <Text fontSize="sm" color="gray.500" mb={5} maxW="280px" mx="auto">
        {filtered
          ? "Try switching filters to see your full history."
          : "Book your first appointment with one of our trusted doctors."}
      </Text>
      <HStack spacing={3} justify="center" flexWrap="wrap">
        {filtered && (
          <Button size="sm" variant="outline" colorScheme="green" borderRadius="full" onClick={onReset}>
            Show All
          </Button>
        )}
        <Button
          size="sm"
          colorScheme="green"
          borderRadius="full"
          leftIcon={<FaCalendarPlus />}
          as={Link}
          to="/doctors"
        >
          Book Appointment
        </Button>
      </HStack>
    </Box>
  </motion.div>
);

const Appointments = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const getData = async () => {
    const res = await GET(`get_appointments?patient_id=${user.patient_code}`);
    return res.data;
  };

  const { isLoading, data, error } = useQuery({
    queryKey: ["appointments"],
    queryFn: getData,
  });

  const filterData = (appointments, filter) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (!Array.isArray(appointments)) return [];

    return appointments
      .filter((appt) => {
        const apptDate = new Date(appt.date);
        const status = String(appt.status || "").trim();
        if (Number.isNaN(apptDate.getTime())) return false;
        switch (filter) {
          case 1: return true;
          case 2: return apptDate >= todayStart && !["Completed","Cancelled","Rejected"].includes(status);
          case 3: return status === "Pending";
          case 4: return status === "Confirmed";
          case 5: return status === "Rejected";
          case 6: return status === "Completed";
          case 7: return status === "Rescheduled";
          case 8: return status === "Cancelled";
          case 9: return status === "Visited";
          default: return true;
        }
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;

  const allData = Array.isArray(data) ? data : [];
  const filteredData = filterData(allData, currentStep);
  const activeFilter = FILTERS.find((f) => f.step === currentStep);

  return (
    <Box bg="gray.50" minH="100vh">
      {/* Header */}
      <Box
        bg="linear-gradient(135deg, #34C38F 0%, #2db580 100%)"
        pt={{ base: 8, md: 12 }}
        pb={{ base: 12, md: 16 }}
        px={4}
        position="relative"
        overflow="hidden"
      >
        {/* Decorative circles */}
        <Box position="absolute" top="-40px" right="-40px" w="200px" h="200px" borderRadius="full" bg="whiteAlpha.100" />
        <Box position="absolute" bottom="-60px" left="-20px" w="160px" h="160px" borderRadius="full" bg="whiteAlpha.50" />

        <Box maxW="720px" mx="auto" position="relative">
          <HStack spacing={3} mb={3} justify="center">
            <Box bg="whiteAlpha.200" p={2} borderRadius="12px">
              <Icon as={FaUserMd} color="white" boxSize={5} />
            </Box>
            <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight={800} color="white" letterSpacing="-0.02em">
              My Appointments
            </Text>
          </HStack>
          <Text fontSize="sm" color="whiteAlpha.800" textAlign="center">
            {allData.length > 0
              ? `${allData.length} total appointment${allData.length !== 1 ? "s" : ""}`
              : "No appointments on record"}
          </Text>
        </Box>
      </Box>

      <Box maxW="720px" mx="auto" px={4} mt="-28px" pb={10}>
        {/* Filter pills — scrollable row */}
        <Box
          bg="white"
          borderRadius="16px"
          boxShadow="0 2px 12px rgba(0,0,0,0.08)"
          p={2}
          mb={5}
          overflowX="auto"
          sx={{ "&::-webkit-scrollbar": { display: "none" }, scrollbarWidth: "none" }}
        >
          <HStack spacing={1} minW="max-content">
            {FILTERS.map((item) => {
              const active = currentStep === item.step;
              const count = item.step === 1 ? allData.length : filterData(allData, item.step).length;
              return (
                <Button
                  key={item.step}
                  size="sm"
                  borderRadius="10px"
                  fontWeight={600}
                  fontSize="xs"
                  px={3}
                  py={2}
                  h="auto"
                  leftIcon={<Icon as={item.icon} boxSize={3} />}
                  bg={active ? "#2db580" : "gray.100"}
                  color={active ? "white" : "gray.700"}
                  _hover={{ bg: active ? "#2db580" : "gray.200" }}
                  onClick={() => setCurrentStep(item.step)}
                  flexShrink={0}
                  rightIcon={
                    count > 0 ? (
                      <Box
                        bg={active ? "whiteAlpha.300" : "green.50"}
                        color={active ? "white" : "green.700"}
                        borderRadius="full"
                        px={1.5}
                        fontSize="10px"
                        fontWeight={700}
                        lineHeight="18px"
                        minW="18px"
                        textAlign="center"
                      >
                        {count}
                      </Box>
                    ) : undefined
                  }
                >
                  {item.name}
                </Button>
              );
            })}
          </HStack>
        </Box>

        {/* Content */}
        {allData.length === 0 ? (
          <EmptyState filtered={false} onReset={() => setCurrentStep(1)} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {filteredData.length > 0 ? (
                <VStack spacing={0} align="stretch">
                  {filteredData.map((appt) => (
                    <AppointmentCard key={appt.id} appointment={appt} />
                  ))}
                </VStack>
              ) : (
                <EmptyState filtered onReset={() => setCurrentStep(1)} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Book CTA always visible */}
        {allData.length > 0 && (
          <Box mt={6} textAlign="center">
            <Button
              as={Link}
              to="/doctors"
              colorScheme="green"
              borderRadius="full"
              size="md"
              leftIcon={<FaCalendarPlus />}
              px={8}
              bgGradient="linear(to-r, #34C38F, #2db580)"
              _hover={{ bgGradient: "linear(to-r, #2db580, #34C38F)", boxShadow: "0 4px 14px rgba(52,195,143,0.35)" }}
            >
              Book New Appointment
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Appointments;
