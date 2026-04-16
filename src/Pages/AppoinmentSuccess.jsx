// src/AppointmentSuccess.js
import {
  Box,
  Text,
  Image,
  Flex,
  VStack,
  Heading,
  Badge,
  Divider,
  Button,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { GET_AUTH } from "../Controllers/ApiControllers";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStorageJSON } from "../lib/storage";
import Loading from "../Components/Loading";
import {
  createGoogleCalendarUrl,
  handleDownloadICalendar,
} from "../Controllers/createCalendarUrls";
import ErrorPage from "./ErrorPage";
import QRCodeComponent from "../Components/QRcode";
import MeetingQR from "../Components/MeeitngQR";

const AppointmentSuccess = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const getData = async () => {
    const currentUser = getStorageJSON("user");
    if (!currentUser?.token) {
      return null;
    }
    const res = await GET_AUTH(currentUser.token, `get_appointment/${id}`);
    if (res?.response !== 200) {
      throw new Error(res?.message || "Failed to fetch appointment details");
    }
    return res.data;
  };
  const currentUser = getStorageJSON("user");
  const { isLoading, data, error, isFetching, refetch } = useQuery({
    queryKey: ["appoinment", id],
    queryFn: getData,
    enabled: !!currentUser?.token,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 0,
  });

  const typeToBadgeColor = {
    OPD: "green",
    "Video Consultant": "blue",
    Emergency: "red",
  };
  const statusToBadgeColor = {
    Confirmed: "green",
    Pending: "orange",
    Completed: "green",
    Cancelled: "red",
    Rejected: "red",
    Rescheduled: "purple",
    Visited: "teal",
  };
  const paymentToBadgeColor = {
    Paid: "green",
    Unpaid: "orange",
    Failed: "red",
    Refunded: "purple",
  };
  const savedStatus = data?.status || "Unknown";
  const savedPaymentStatus = data?.payment_status || "Unknown";
  const confirmationTitle =
    savedStatus === "Pending"
      ? "Appointment submitted"
      : savedStatus === "Confirmed"
      ? "Appointment confirmed"
      : "Appointment recorded";
  const confirmationDescription =
    savedStatus === "Pending" || savedPaymentStatus === "Unpaid"
      ? "Your booking was saved and is currently pending. Payment is due at the hospital unless advised otherwise."
      : data?.type?.toUpperCase() === "OPD"
      ? "Visit the clinic and scan the provided QR code to instantly generate your appointment queue number"
      : "Click join meeting or scan the QR code to join the meeting.";

  const event = {
    title: `Appointment with Dr. ${data?.doct_f_name} ${data?.doct_l_name}`,
    start: `${data?.date}T${data?.time_slots}`,
    description: `Department: ${data?.dept_title}\nType: ${data?.type}`,
    location: "Your Clinic Location",
  };

  const googleCalendarUrl = createGoogleCalendarUrl(event);
  const appointmentId = data?.id || id;
  const bookingNumber = data?.booking_number;
  const QrData = {
    booking_number: bookingNumber || null,
    appointment_id: appointmentId,
    date: data?.date,
    time: data?.time_slots,
  };

  const appointmentData = {
    qrValue: JSON.stringify(QrData),
  };

  if (isLoading) return <Loading />;

  if (!currentUser?.token)
    return (
      <Box w="800px" maxW={"95vw"} mx="auto" mt={10}>
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          Your booking is recorded. Reference: #{id}. Please log in to view full
          appointment details.
        </Alert>
        <Flex mt={4} gap={3} justify="center" flexWrap="wrap">
          <Button
            colorScheme="blue"
            size="sm"
            onClick={() => {
              navigate("/login");
            }}
          >
            Login
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate("/");
            }}
          >
            Back to Home
          </Button>
        </Flex>
      </Box>
    );

  if (error)
    return (
      <Box w="800px" maxW={"95vw"} mx="auto" mt={10}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          We could not load appointment #{id} yet. It may still be syncing.
        </Alert>
        <Flex mt={4} gap={3} justify="center" flexWrap="wrap">
          <Button
            colorScheme="green"
            size="sm"
            onClick={() => {
              refetch();
            }}
            isLoading={isFetching}
          >
            Retry Fetch
          </Button>
          <Button
            colorScheme="blue"
            size="sm"
            onClick={() => {
              navigate("/login");
            }}
          >
            Login
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate("/appointments");
            }}
          >
            View Appointments
          </Button>
        </Flex>
      </Box>
    );

  if (!data) return <ErrorPage />;

  return (
    <Box
      p={5}
      shadow="md"
      borderWidth="1px"
      borderRadius="md"
      w="800px"
      maxW={"95vw"}
      mx="auto"
      mt={10}
      bg={"#fff"}
    >
      <VStack spacing={4}>
        <Image
          boxSize="60px"
          objectFit="cover"
          src="/confirm.png" // Add your own success icon here
          alt="Success"
        />
        <Heading size="sm">Booking Number: {bookingNumber || "Pending assignment"}</Heading>
        <Heading size="xs" color="gray.600">Appointment ID: #{appointmentId}</Heading>
        <Badge
          size="sm"
          p={2}
          fontWeight={800}
          colorScheme={typeToBadgeColor[data?.type] || "gray"}
          minW={100}
          textAlign={"center"}
          fontSize={12}
          letterSpacing={1}
        >
          {data?.type || "Unknown"}
        </Badge>
        <Flex gap={2} flexWrap="wrap" justify="center">
          <Badge
            size="sm"
            p={2}
            fontWeight={700}
            colorScheme={statusToBadgeColor[savedStatus] || "gray"}
          >
            Status: {savedStatus}
          </Badge>
          <Badge
            size="sm"
            p={2}
            fontWeight={700}
            colorScheme={paymentToBadgeColor[savedPaymentStatus] || "gray"}
          >
            Payment: {savedPaymentStatus}
          </Badge>
        </Flex>

        {data?.type?.toUpperCase() === "OPD" ? (
          <QRCodeComponent data={appointmentData} />
        ) : data?.type === "Video Consultant" ? (
          data?.meeting_link && <MeetingQR data={data?.meeting_link} />
        ) : null}

        {data?.type?.toUpperCase() !== "OPD" ? (
          <Flex>
            <Button
              size={"sm"}
              _hover={{
                textTransform: "none",
                textDecoration: "none",
              }}
              colorScheme={"green"}
              width={160}
              isDisabled={!data?.meeting_link}
              onClick={() => {
                window.open(data?.meeting_link, "_blank");
              }}
            >
              {" "}
              Join Meeting
            </Button>
          </Flex>
        ) : null}
        <Heading
          size={{ base: "md", md: "lg" }}
          color="primary.bg"
          mb={-2}
          textAlign={"center"}
        >
          {confirmationTitle}
        </Heading>
        <Text
          mt={0}
          fontWeight={500}
          color={"gray.600"}
          textAlign={"center"}
          fontSize={{ base: "14px", md: "16px" }}
        >
          {confirmationDescription}
        </Text>

        <Flex
          justify={{ base: "center", md: "space-between" }}
          w={{ base: "100%", md: "80%" }}
          mt={4}
          flexWrap={"wrap"}
          gap={5}
        >
          <Box>
            <Text fontWeight="bold" textAlign={"center"} color={"gray.700"}>
              Doctor
            </Text>
            <Text fontSize={14}>
              Dr. {data?.doct_f_name} {data?.doct_l_name}
            </Text>
          </Box>
          <Box>
            <Text fontWeight="bold" color={"gray.700"} textAlign={"center"}>
              Date & Time
            </Text>
            <Text fontSize={14}>
              {new Date(data?.date).toLocaleDateString()} {data?.time_slots}
            </Text>
          </Box>
          <Box>
            <Text fontWeight="bold" color={"gray.700"} textAlign={"center"}>
              Patient Name
            </Text>
            <Text fontSize={14}>
              {data?.patient_f_name} {data?.patient_l_name}
            </Text>
          </Box>
        </Flex>
        <Divider />
        <Flex gap={4}>
          <Button
            colorScheme="gray"
            onClick={() => {
              window.open(googleCalendarUrl, "_blank");
            }}
            size={"sm"}
          >
            <Image src="/google.png" w={5} mr={3} /> Add to Calender
          </Button>
          <Button
            colorScheme="gray"
            onClick={() => {
              handleDownloadICalendar(event);
            }}
            size={"sm"}
          >
            <Image src="/appleLogo.png" w={5} mr={3} /> Add to Calender
          </Button>
        </Flex>
      </VStack>
    </Box>
  );
};

export default AppointmentSuccess;
