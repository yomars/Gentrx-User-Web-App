import { MdOutlineLogin } from "react-icons/md";
import { IoMdRefresh } from "react-icons/io";
import { TbBrandZoom } from "react-icons/tb";
/* eslint-disable react/prop-types */
import { AiOutlineRight } from "react-icons/ai";
import { FaDirections, FaFileDownload, FaUserAlt, FaChevronLeft } from "react-icons/fa";
import { AiOutlineDownload } from "react-icons/ai";
import {
  Box,
  Flex,
  Text,
  Avatar,
  Badge,
  Button,
  HStack,
  Divider,
  InputGroup,
  InputLeftElement,
  Input,
  Image,
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogCloseButton,
  AlertDialogBody,
  AlertDialogFooter,
  useToast,
  Link,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  IconButton,
} from "@chakra-ui/react";
import moment from "moment";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "../Components/Loading";
import { ADD, GET } from "../Controllers/ApiControllers";
import imageBaseURL from "../Controllers/image";
import { CalendarIcon } from "@chakra-ui/icons";
import { useRef } from "react";
import user from "../Controllers/user";
import showToast from "../Controllers/ShowToast";
import api from "../Controllers/api";
import printPDF from "../Controllers/printPDF";
import getStatusBadge from "../Hooks/StatusBadge";
import RatingStars from "../Hooks/RatingStars";
import AddDoctorReview from "../Components/AddDoctorReview";
import { AnimatePresence, motion } from "framer-motion";
import { GoFileSubmodule } from "react-icons/go";
import { resolveAttachmentUrl } from "../lib/media";
import { getDoctorIdentifier, getPatientIdentifier } from "../lib/appointmentIdentity";

const formatDate = (dateString) => {
  const date = moment(dateString);
  return {
    month: date.format("MMM"),
    date: date.format("DD"),
    year: date.format("YYYY"),
  };
};
function openFile(fileRecord) {
  const finalURL = resolveAttachmentUrl(fileRecord, ["file"]);
  if (!finalURL) return;
  window.open(finalURL, "_blank", "noopener,noreferrer");
}

const AppointmentDetails = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: ratingIsOpen,
    onOpen: ratingOnOpen,
    onClose: ratingOnClose,
  } = useDisclosure();
  const cancelRef = useRef();
  const getData = async () => {
    const res = await GET(`get_appointment/${id}`);
    return res.data;
  };
  // req history
  const getReqData = async () => {
    const res = await GET(`get_appointment_cancel_req/appointment/${id}`);
    return res.data;
  };
  const getInvoices = async () => {
    const res = await GET(`get_invoice/appointment/${id}`);
    return res.data;
  };
  const getPrescription = async () => {
    const res = await GET(`get_prescription?appointment_id=${id}`);
    return res.data;
  };
  const getQueueNumber = async () => {
    const res = await GET(
      `get_appointment_check_in?doctor_id=${doctorIdentifier}&start_date=${appointmentData?.date}&end_date=${appointmentData?.date}`
    );
    return res.data;
  };
  const getPatientFiles = async () => {
    const res = await GET(
      `get_patient_file?patient_id=${patientIdentifier}`
    );
    return res.data;
  };

  const { isLoading, data: appointmentData } = useQuery({
    queryKey: ["appointment", id],
    queryFn: getData,
  });
  const { isLoading: reqHistoryLoading, data: reqHistoryData } = useQuery({
    queryKey: ["appointment-req-history", id],
    queryFn: getReqData,
  });
  const { isLoading: invoiceLoading, data: invoiceData } = useQuery({
    queryKey: ["invoice", id],
    queryFn: getInvoices,
  });
  const { isLoading: prescriptionLoading, data: prescriptionData } = useQuery({
    queryKey: ["prescription", id],
    queryFn: getPrescription,
  });

  const doctorIdentifier = getDoctorIdentifier(
    appointmentData,
    "AppointmentDetails:get_appointment_check_in"
  );
  const patientIdentifier = getPatientIdentifier(
    appointmentData,
    "AppointmentDetails:get_patient_file"
  );

  // Add the missing queries:
  const { 
    data: queueData, 
    isFetching: queueIsFetching,
    refetch 
  } = useQuery({
    queryKey: ["queue", doctorIdentifier, appointmentData?.date],
    queryFn: getQueueNumber,
    enabled: !!doctorIdentifier && !!appointmentData?.date && appointmentData?.type === "OPD" && appointmentData?.status === "Confirmed",
  });

  const { isLoading: patientFilesLoading, data: patientFilesData } = useQuery({
    queryKey: ["patient-files", patientIdentifier],
    queryFn: getPatientFiles,
    enabled: !!patientIdentifier,
  });

  const getLaboratoryRequests = async () => {
    const res = await GET(
      `get_laboratory_requests_by_appointment/${id}`
    );
    return res.data;
  };

  const { isLoading: labRequestsLoading, data: labRequestsData } = useQuery({
    queryKey: ["laboratory-requests", id],
    queryFn: getLaboratoryRequests,
  });

  const { month, date, year } = formatDate(appointmentData?.date);
  const queueNumb = queueData?.findIndex((queue) => {
    return queue?.appointment_id == id;
  });

  if (
    isLoading ||
    reqHistoryLoading ||
    invoiceLoading ||
    prescriptionLoading ||
    queueIsFetching ||
    patientFilesLoading
  )
    return <Loading />;
  return (
    <Box bg="gray.50" minH="100vh">
      {/* Header */}
      <Box
        bg="linear-gradient(135deg, #34C38F 0%, #2db580 100%)"
        pt={{ base: 8, md: 10 }}
        pb={{ base: 14, md: 16 }}
        px={4}
        position="relative"
        overflow="hidden"
      >
        <Box position="absolute" top="-40px" right="-40px" w="180px" h="180px" borderRadius="full" bg="whiteAlpha.100" />
        <Box position="absolute" bottom="-50px" left="-20px" w="140px" h="140px" borderRadius="full" bg="whiteAlpha.50" />
        <Box maxW="640px" mx="auto" position="relative">
          <Button
            variant="ghost"
            color="white"
            leftIcon={<FaChevronLeft />}
            mb={3}
            onClick={() => navigate(-1)}
            _hover={{ bg: "whiteAlpha.200" }}
            size="sm"
          >
            Back
          </Button>
          <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight={800} color="white" textAlign="center" mb={3}>
            Appointment #{id}
          </Text>
          <Flex justify="center">
            <Box display="inline-flex" alignItems="center" px={3} py={1} borderRadius="full" bg="whiteAlpha.200">
              <Box w={2} h={2} borderRadius="full" bg="white" mr={2} />
              <Text fontSize="sm" fontWeight={700} color="white">{appointmentData?.status}</Text>
            </Box>
          </Flex>
        </Box>
      </Box>
      {/* Main content */}
      <Box maxW="640px" mx="auto" px={4} mt="-28px" pb={10}>

        {/* Doctor Card */}
        <Box bg="white" borderRadius="20px" boxShadow="0 4px 20px rgba(0,0,0,0.1)" p={5} mb={4}>
          <Flex align="center" gap={4}>
            <Box
              w="90px"
              borderRadius="12px"
              overflow="hidden"
              flexShrink={0}
              bg="gray.100"
            >
              <Image
                src={`${imageBaseURL}/${appointmentData.doct_image}`}
                w="100%"
                h="auto"
                display="block"
                fallback={<Avatar borderRadius="12px" size="xl" />}
              />
            </Box>
            <Box flex={1} minW={0}>
              <Text fontSize="lg" fontWeight={800} color="gray.800" noOfLines={1}>
                {appointmentData.doct_f_name} {appointmentData.doct_l_name}
              </Text>
              <Text fontSize="sm" fontWeight={600} color="green.600" noOfLines={1}>
                {appointmentData.doct_specialization}
              </Text>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {appointmentData.dept_title} · {appointmentData.clinic_title}
              </Text>
              <HStack spacing={1} mt={1}>
                <RatingStars rating={appointmentData.average_rating} />
                <Text fontSize="xs" color="gray.500">({appointmentData.number_of_reviews} reviews)</Text>
              </HStack>
            </Box>
          </Flex>
          <Divider my={4} />
          <Flex gap={2} flexWrap="wrap">
            {(appointmentData?.status === "Visited" || appointmentData?.status === "Completed") && (
              <Button size="sm" colorScheme="green" borderRadius="full" flex={1} minW="120px" onClick={ratingOnOpen}>
                Review Doctor
              </Button>
            )}
            {appointmentData.type === "OPD" && appointmentData?.status === "Confirmed" && (
              queueNumb >= 0 ? (
                <Button
                  size="sm" colorScheme="green" variant="outline" borderRadius="full"
                  flex={1} minW="120px" rightIcon={<IoMdRefresh />}
                  onClick={() => {
                    // @ts-ignore
                    queryClient.invalidateQueries(["queue", doctorIdentifier, appointmentData?.date]);
                    refetch();
                  }}
                >
                  Queue #{queueNumb + 1}
                </Button>
              ) : (
                <Button
                  size="sm" colorScheme="green" variant="outline" borderRadius="full"
                  flex={1} minW="120px" rightIcon={<MdOutlineLogin />}
                  onClick={() => navigate(`/appointment-success/${id}`)}
                >
                  Check-In
                </Button>
              )
            )}
            {appointmentData?.type === "Video Consultant" && (
              <Button
                size="sm" colorScheme="teal" borderRadius="full" flex={1} minW="120px"
                leftIcon={<TbBrandZoom fontSize="18px" />}
                isDisabled={appointmentData?.status === "Cancelled" || appointmentData?.status === "Rejected"}
                onClick={() => window.open(appointmentData?.meeting_link, "_blank")}
              >
                Join Meeting
              </Button>
            )}
          </Flex>
        </Box>

        {/* Appointment Details */}
        <Box bg="white" borderRadius="16px" boxShadow="0 1px 8px rgba(0,0,0,0.06)" p={5} mb={4}>
          <Text fontSize="xs" fontWeight={700} color="gray.400" textTransform="uppercase" letterSpacing="0.1em" mb={4}>
            Appointment Details
          </Text>
          <Flex justify="space-between" align="center" py={2} borderBottom="1px solid" borderColor="gray.50">
            <Text fontSize="sm" color="gray.500">Patient</Text>
            <Text fontSize="sm" fontWeight={700} color="gray.800">{appointmentData.patient_f_name} {appointmentData.patient_l_name}</Text>
          </Flex>
          <Flex justify="space-between" align="center" py={2} borderBottom="1px solid" borderColor="gray.50">
            <Text fontSize="sm" color="gray.500">Date</Text>
            <Text fontSize="sm" fontWeight={700} color="gray.800">{month} {date}, {year}</Text>
          </Flex>
          <Flex justify="space-between" align="center" py={2} borderBottom="1px solid" borderColor="gray.50">
            <Text fontSize="sm" color="gray.500">Time</Text>
            <Text fontSize="sm" fontWeight={700} color="gray.800">{moment(appointmentData.time_slots, "HH:mm:ss").format("h:mm A")}</Text>
          </Flex>
          <Flex justify="space-between" align="center" py={2} borderBottom="1px solid" borderColor="gray.50">
            <Text fontSize="sm" color="gray.500">Type</Text>
            <Badge colorScheme={appointmentData.type === "Emergency" ? "red" : "green"} borderRadius="full" px={3} fontSize="xs">
              {appointmentData.type}
            </Badge>
          </Flex>
          <Flex justify="space-between" align="center" py={2}>
            <Text fontSize="sm" color="gray.500">Booking No.</Text>
            <Text fontSize="sm" fontWeight={700} color={appointmentData?.booking_number ? "gray.800" : "orange.500"}>
              {appointmentData?.booking_number || "Pending assignment"}
            </Text>
          </Flex>
        </Box>

        {/* Laboratory Requests */}
        <Box bg="white" borderRadius="16px" boxShadow="0 1px 8px rgba(0,0,0,0.06)" p={5} mb={4}>
          <Text fontSize="xs" fontWeight={700} color="gray.400" textTransform="uppercase" letterSpacing="0.1em" mb={3}>
            Laboratory Requests
          </Text>
          {labRequestsLoading ? (
            <Loading />
          ) : labRequestsData?.length ? (
            labRequestsData.map((request, index) => (
              <Box key={request.id} mb={3}>
                <Button
                  size="sm" variant="outline" colorScheme="green" borderRadius="full"
                  rightIcon={<AiOutlineDownload fontSize={16} />}
                  onClick={() => printPDF(`${api}/laboratory_request/generatePDF/${request.id}`)}
                >
                  Lab Request #{index + 1}
                </Button>
                <Flex gap={2} mt={2} flexWrap="wrap" ml={1}>
                  {request.items?.map((item) => (
                    <Badge key={item.id} colorScheme={item.is_urgent ? "red" : "blue"} fontSize="10px" borderRadius="full">
                      {item.test_name}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            ))
          ) : (
            <Text fontSize="sm" color="gray.400" fontStyle="italic">No laboratory requests for this appointment</Text>
          )}
        </Box>

        {/* Prescriptions */}
        <Box bg="white" borderRadius="16px" boxShadow="0 1px 8px rgba(0,0,0,0.06)" p={5} mb={4}>
          <Text fontSize="xs" fontWeight={700} color="gray.400" textTransform="uppercase" letterSpacing="0.1em" mb={3}>
            Prescriptions
          </Text>
          {prescriptionData?.length ? (
            <Flex gap={2} flexWrap="wrap">
              {prescriptionData.map((item, index) => (
                <Button
                  key={item.id}
                  size="sm" variant="outline" colorScheme="green" borderRadius="full"
                  rightIcon={<AiOutlineDownload fontSize={16} />}
                  onClick={() => {
                    const pdfURL = resolveAttachmentUrl(item, ["pdf_file"]);
                    if (pdfURL) { printPDF(pdfURL); } else { printPDF(`${api}/prescription/generatePDF/${item.id}`); }
                  }}
                >
                  Prescription #{index + 1}
                </Button>
              ))}
            </Flex>
          ) : (
            <Text fontSize="sm" color="gray.400" fontStyle="italic">No prescriptions for this appointment</Text>
          )}
        </Box>

        {/* Patient Files */}
        <Box bg="white" borderRadius="16px" boxShadow="0 1px 8px rgba(0,0,0,0.06)" p={5} mb={4}>
          <Text fontSize="xs" fontWeight={700} color="gray.400" textTransform="uppercase" letterSpacing="0.1em" mb={3}>
            Patient Files
          </Text>
          {(patientFilesData ?? []).length ? (
            <AnimatePresence>
              {patientFilesData.map((file) => (
                <motion.div key={file.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <Flex align="center" justify="space-between" bg="gray.50" borderRadius="12px" p={3} mb={2}>
                    <Flex align="center" gap={3}>
                      <Box bg="green.50" p={2} borderRadius="8px">
                        <GoFileSubmodule fontSize={18} color="#2db580" />
                      </Box>
                      <Box>
                        <Text fontSize="sm" fontWeight={600}>{file.file_name}</Text>
                        <Text fontSize="xs" color="gray.500">{file.f_name} {file.l_name} · {moment(file.created_at).format("D MMM YY")}</Text>
                      </Box>
                    </Flex>
                    <IconButton
                      icon={<FaFileDownload />}
                      colorScheme="green"
                      variant="ghost"
                      size="sm"
                      borderRadius="full"
                      aria-label="Download file"
                      onClick={(e) => { e.stopPropagation(); openFile(file); }}
                    />
                  </Flex>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <Text fontSize="sm" color="gray.400" fontStyle="italic">No patient files found</Text>
          )}
        </Box>

        {/* Payment */}
        <Box bg="white" borderRadius="16px" boxShadow="0 1px 8px rgba(0,0,0,0.06)" p={5} mb={4}>
          <Text fontSize="xs" fontWeight={700} color="gray.400" textTransform="uppercase" letterSpacing="0.1em" mb={3}>
            Payment
          </Text>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" color="gray.500">Status</Text>
            <Badge
              colorScheme={appointmentData?.payment_status === "Paid" ? "green" : "orange"}
              fontWeight="bold" variant="solid" borderRadius="full" px={3}
            >
              {appointmentData?.payment_status || "Not Paid"}
            </Badge>
          </Flex>
          <Text fontSize="xs" color="gray.400" mb={3}>Payment ID #{appointmentData.id}</Text>
          {invoiceData && (
            <Button
              size="sm" variant="outline" colorScheme="green" borderRadius="full"
              rightIcon={<AiOutlineDownload fontSize={16} />}
              onClick={() => printPDF(`${api}/invoice/generatePDF/${invoiceData.id}`)}
            >
              Download Invoice #{invoiceData.id}
            </Button>
          )}
        </Box>

        {/* Contact */}
        <Contact data={appointmentData} />

        {/* Directions */}
        <Box mb={4}>
          <Button
            leftIcon={<FaDirections />}
            width="100%"
            borderRadius="full"
            size="md"
            bgGradient="linear(to-r, #34C38F, #2db580)"
            color="white"
            _hover={{ bgGradient: "linear(to-r, #2db580, #34C38F)", boxShadow: "0 4px 14px rgba(52,195,143,0.35)" }}
            as={Link}
            href={`https://www.google.com/maps?q=${appointmentData.clinic_latitude},${appointmentData.clinic_longitude}`}
            isExternal
          >
            Directions to Clinic
          </Button>
        </Box>

        {/* Cancellation */}
        {["Pending", "Confirmed", "Rescheduled", "Cancelled"].includes(appointmentData?.status) && (
          <Box mb={4}>
            <Button
              width="100%"
              colorScheme="red"
              variant="outline"
              borderRadius="full"
              rightIcon={<AiOutlineRight />}
              onClick={() => {
                if (
                  appointmentData.current_cancel_req_status === "Approved" ||
                  appointmentData.current_cancel_req_status === "Rejected"
                ) return;
                onOpen();
              }}
            >
              {appointmentData.current_cancel_req_status === null
                ? "Request Cancellation"
                : `Cancellation: ${appointmentData.current_cancel_req_status}`}
            </Button>
            {appointmentData.current_cancel_req_status !== null && (
              <Box bg="gray.50" borderRadius="12px" px={3} py={3} mt={3}>
                <Text fontSize="sm" fontWeight={700} mb={2} color="gray.600">Request History</Text>
                {reqHistoryData?.map((item) => <ReqHistory key={item.id} item={item} />)}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Modals */}
      <DailogModal
        cancelRef={cancelRef}
        isOpen={isOpen}
        onClose={onClose}
        currentStatus={appointmentData.current_cancel_req_status}
        appointID={id}
      />
      {ratingIsOpen && (
        <AddDoctorReview
          patient_id={appointmentData?.patient_id || patientIdentifier}
          doctID={doctorIdentifier}
          AppID={appointmentData?.id}
          isOpen={ratingIsOpen}
          onClose={ratingOnClose}
        />
      )}
    </Box>
  );
};

export default AppointmentDetails;

const DailogModal = ({
  cancelRef,
  isOpen,
  onClose,
  currentStatus,
  appointID,
}) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  // initate cancel
  const handleCancellation = async (data) => {
    let formData = {
      appointment_id: data.id,
      status: data.status,
    };
    try {
      const res = await ADD(user.token, data.url, formData);
      if (res.response === 200) {
        showToast(toast, "success", "Success!");
        // @ts-ignore
        queryClient.invalidateQueries("cartdata");
        return res;
      } else {
        showToast(toast, "error", res.message);
        return res;
      }
    } catch (error) {
      return error;
    }
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      await handleCancellation(data);
    },
    onSuccess: () => {
      // @ts-ignore
      queryClient.invalidateQueries(["appointment-req-history", appointID]);
      // @ts-ignore
      queryClient.invalidateQueries(["appointment", appointID]);
      onClose();
    },
    onError: (error) => {
      showToast(toast, "error", JSON.stringify(error));
    },
  });

  if (mutation.isPending) return <Loading />;

  return (
    <AlertDialog
      motionPreset="slideInBottom"
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isOpen={isOpen}
      isCentered
    >
      <AlertDialogOverlay />

      <AlertDialogContent m={{ base: 2, md: 0 }}>
        <AlertDialogHeader fontSize={"md"}>
          {currentStatus === null
            ? "Cancel Appointment"
            : "Delete Cancellation Request"}{" "}
          ?
        </AlertDialogHeader>
        <AlertDialogCloseButton />
        <AlertDialogBody>
          {currentStatus === null
            ? "Are you sure , you want to cancel this appointment"
            : "Are you sure , you want to delete cancellation request"}{" "}
          ?
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button ref={cancelRef} onClick={onClose} size={"sm"} minW={20}>
            No
          </Button>
          <Button
            colorScheme="red"
            ml={3}
            size={"sm"}
            minW={20}
            onClick={() => {
              currentStatus === null
                ? mutation.mutate({
                    id: appointID,
                    status: "Initiated",
                    url: "appointment_cancellation",
                  })
                : currentStatus === "Initiated"
                ? mutation.mutate({
                    id: appointID,
                    status: "Initiated",
                    url: "delete_appointment_cancellation",
                  })
                : null;
            }}
          >
            Yes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const ReqHistory = ({ item }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "Initiated":
        return "yellow.400"; // Replace with desired Chakra color
      case "Rejected":
        return "red.500"; // Replace with desired Chakra color
      case "Approved":
        return "green.500"; // Replace with desired Chakra color
      case "Processing":
        return "orange.400"; // Replace with desired Chakra color
      default:
        return "gray.500"; // Default color
    }
  };
  return (
    <Box>
      {" "}
      <Flex gap={5} align={"center"}>
        <Box
          bg={getStatusColor(item.status)}
          width="8px"
          height="8px"
          borderRadius="50%"
        />
        <Box>
          {" "}
          <Text fontSize={"sm"} fontWeight={600}>
            {item.status}
          </Text>
          <Text fontSize={"xs"} fontWeight={500} color={"gray.600"}>
            {moment(item.created_at).format("DD-MM-YYYY hh:mm A")}
          </Text>
        </Box>
      </Flex>
      <Divider borderColor={"#fff"} my={2} borderWidth={1} />
    </Box>
  );
};

const Contact = ({ data }) => {
  return (
    <>
      {data && (
        <Box mt={5}>
          <Text fontWeight="bold">Contact Us</Text>
          <HStack spacing={8} mt={2}>
            <Button
              variant="link"
              colorScheme="gray"
              color={"gray.600"}
              display={"flex"}
              flexDir={"column"}
              as={Link}
              href={`tel:${data.clinic_phone}`}
              isExternal
            >
              <Image src="/phone.png" w={9} />
              <Text mt={2} fontSize={"sm"}>
                Phone
              </Text>
            </Button>
            <Button
              variant="link"
              colorScheme="gray"
              color={"gray.600"}
              display={"flex"}
              flexDir={"column"}
              as={Link}
              href={`https://wa.me/${data.isd_code}${data.clinic_whatsapp}`}
              isExternal
            >
              <Image src="/whatsapp.png" w={9} />
              <Text mt={2} fontSize={"sm"}>
                Whatspp
              </Text>
            </Button>

            <Button
              variant="link"
              colorScheme="gray"
              color={"gray.600"}
              display={"flex"}
              flexDir={"column"}
              as={Link}
              isExternal
              href={`mailto:${data.clinic_email}`}
            >
              <Image src="/gmail.png" w={9} />
              <Text mt={2} fontSize={"sm"}>
                Gmail
              </Text>
            </Button>
            <Button
              variant="link"
              colorScheme="gray"
              color={"gray.600"}
              display={"flex"}
              flexDir={"column"}
              as={Link}
              isExternal
              href={`https://www.google.com/maps?q=${data.clinic_latitude},${data.clinic_longitude}`}
            >
              <Image src="/google-maps.png" w={9} />
              <Text mt={2} fontSize={"sm"}>
                Location
              </Text>
            </Button>
            {data?.clinic_ambulance_btn_enable && (
              <Button
                variant="link"
                colorScheme="gray"
                color={"gray.600"}
                display={"flex"}
                flexDir={"column"}
                as={Link}
                isExternal
                href={`tel:${data.clinic_ambulance_number}`}
              >
                <Image src="/ambulance.png" w={9} />
                <Text mt={2} fontSize={"sm"}>
                  Ambulance
                </Text>
              </Button>
            )}
          </HStack>
        </Box>
      )}
    </>
  );
};
