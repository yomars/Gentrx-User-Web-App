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
} from "@chakra-ui/react";
import { GET } from "../Controllers/ApiControllers";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Loading from "../Components/Loading";
import {
  createGoogleCalendarUrl,
  handleDownloadICalendar,
} from "../Controllers/createCalendarUrls";
import ErrorPage from "./ErrorPage";
import QRCodeComponent from "../Components/QRcode";
import MeetingQR from "../Components/MeeitngQR";

const AppointmentSuccess = () => {
  const { id } = useParams();
  const getData = async () => {
    const res = await GET(`get_appointment/${id}`);
    return res.data;
  };
  const { isLoading, data, error } = useQuery({
    queryKey: ["appoinment", id],
    queryFn: getData,
  });

  const typeToBadgeColor = {
    OPD: "green",
    "Video Consultant": "blue",
    Emergency: "red",
  };

  const event = {
    title: `Appointment with Dr. ${data?.doct_f_name} ${data?.doct_l_name}`,
    start: `${data?.date}T${data?.time_slots}`,
    description: `Department: ${data?.dept_title}\nType: ${data?.type}`,
    location: "Your Clinic Location",
  };

  const googleCalendarUrl = createGoogleCalendarUrl(event);
  const QrData = {
    appointment_id: id,
    date: data?.date,
    time: data?.time_slots,
  };

  const appointmentData = {
    qrValue: JSON.stringify(QrData),
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;

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
        <Heading size="sm">Appointment ID: #{data.id}</Heading>
        <Badge
          size="sm"
          p={2}
          fontWeight={800}
          colorScheme={typeToBadgeColor[data.type]}
          minW={100}
          textAlign={"center"}
          fontSize={12}
          letterSpacing={1}
        >
          {data.type}
        </Badge>

        {data?.type === "OPD" ? (
          <QRCodeComponent data={appointmentData} />
        ) : data?.type === "Video Consultant" ? (
          data?.meeting_link && <MeetingQR data={data?.meeting_link} />
        ) : null}

        {data?.type !== "OPD" ? (
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
          Your Appointment Booked successfully!
        </Heading>
        <Text
          mt={0}
          fontWeight={500}
          color={"gray.600"}
          textAlign={"center"}
          fontSize={{ base: "14px", md: "16px" }}
        >
          {data.type === "OPD"
            ? "Visit the clinic and scan the provided QR code to instantly generate your appointment queue number"
            : "Click join meeting or scan the QR code to join the meeting."}
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
              Dr. {data.doct_f_name} {data.doct_l_name}
            </Text>
          </Box>
          <Box>
            <Text fontWeight="bold" color={"gray.700"} textAlign={"center"}>
              Date & Time
            </Text>
            <Text fontSize={14}>
              {new Date(data.date).toLocaleDateString()} {data.time_slots}
            </Text>
          </Box>
          <Box>
            <Text fontWeight="bold" color={"gray.700"} textAlign={"center"}>
              Patient Name
            </Text>
            <Text fontSize={14}>
              {data.patient_f_name} {data.patient_l_name}
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
