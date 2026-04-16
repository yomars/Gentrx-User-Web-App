// @ts-nocheck
import { FaUser } from "react-icons/fa";
import { BsPersonAdd } from "react-icons/bs";
import { GrEmergency } from "react-icons/gr";
import { BsFillCameraVideoFill } from "react-icons/bs";
import { MdHandshake } from "react-icons/md";
/* eslint-disable react/prop-types */
import { BsFillClipboardCheckFill } from "react-icons/bs";
import { CgFileDocument } from "react-icons/cg";
import { BiCalendar } from "react-icons/bi";
import { BsFillMenuButtonWideFill } from "react-icons/bs";
import {
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Image,
  Input,
  InputGroup,
  InputLeftAddon,
  Text,
  useDisclosure,
  useToast,
  SimpleGrid,
  RadioGroup,
  Stack,
  Radio,
  Alert,
  AlertIcon,
  AlertTitle,
  Select,
  Badge,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ADD, GET, GET_AUTH } from "../Controllers/ApiControllers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "../Components/Loading";
import imageBaseURL from "../Controllers/image";
import { AnimatePresence, motion } from "framer-motion";
import moment from "moment";
import { useForm } from "react-hook-form";
import user from "../Controllers/user";
import logoutFn from "../Controllers/logout";
import showToast from "../Controllers/ShowToast";
import currency from "../Controllers/currency";
import "swiper/swiper-bundle.css";
import { Swiper, SwiperSlide } from "swiper/react";
import ISDCODEMODAL from "../Components/ISDCODEMODAL";
import defaultISD from "../Controllers/defaultISD";
import RazorpayPaymentController from "../Controllers/RazorpayPaymentController";
import ErrorPage from "./ErrorPage";
import LoginModal from "../Components/LoginModal";
import useSettingsData from "../Hooks/SettingData";
import PaymentGetwayData from "../Hooks/Paymntgetways";
import StripePaymentController from "../Controllers/StripePayController";
import { clearPendingAppointmentPayment } from "../lib/walletTopup";

const steps = [
  {
    Name: "Doctor",
    step: 1,
    icon: <BsFillMenuButtonWideFill />,
  },
  {
    Name: "Date & Time",
    step: 2,
    icon: <BiCalendar />,
  },
  {
    Name: "Patient Details",
    step: 3,
    icon: <CgFileDocument />,
  },
  {
    Name: "Summary",
    step: 4,
    icon: <BsFillClipboardCheckFill />,
  },
];
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

function NewAppointment() {
  const toast = useToast();
  const { doctor, typeApp } = useParams();
  const [step, setStep] = useState(1);
  const [Doctordetails, setDoctordetails] = useState(doctor);
  const [appoinmentType, setappoinmentType] = useState(typeApp);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setselectedSlot] = useState(null);
  const [patientDetails, setpatientDetails] = useState(null);

  const handleNextStep = (nextStep) => {
    if (appoinmentType.id === 3 && step === 1) {
      setStep(3);
    }
    if (appoinmentType.id === 3 && nextStep === 2) {
      return;
    }

    if (nextStep < step) {
      setStep(nextStep);
    } else if (nextStep === step) {
      setStep(nextStep);
    } else {
      if (step === 1 && (!Doctordetails || !appoinmentType)) {
        showToast(
          toast,
          "error",
          "Please select doctor and Appointment type before proceeding."
        );
        return;
      }
      if (step === 2 && (!selectedDate || !selectedSlot)) {
        showToast(
          toast,
          "error",
          "Please select date  & time slot before proceeding."
        );
        return;
      }
      if (step === 3 && !patientDetails) {
        showToast(
          toast,
          "error",
          "Please select or add patient details before proceeding."
        );
        return;
      }
      setStep(nextStep);
    }
  };

  function setAllNull() {
    setDoctordetails();
    setappoinmentType();
    setSelectedDate();
    setselectedSlot();
    setpatientDetails();
  }

  const ShowPage = (step) => {
    switch (step) {
      case 1:
        return (
          <Step1
            setStep={setStep}
            Doctordetails={Doctordetails}
            setDoctordetails={setDoctordetails}
            appoinmentType={appoinmentType}
            setAppointmentType={setappoinmentType}
          />
        );
      case 2:
        return (
          <Step2
            appoinmentType={appoinmentType}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedSlot={selectedSlot}
            setselectedSlot={setselectedSlot}
            setStep={setStep}
            Doctordetails={Doctordetails}
          />
        );
      case 3:
        return (
          <Step3 setPatientDetails={setpatientDetails} setStep={setStep} />
        );
      case 4:
        return (
          <Step4
            patientDetails={patientDetails}
            Doctordetails={Doctordetails}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            appoinmentType={appoinmentType}
            setAllNull={setAllNull}
          />
        );
      default:
        return "Unknown Step";
    }
  };

  return (
    <Box>
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
            Book Appointment
          </Text>
        </Box>
      </Box>
      <Box className="container">
        <Flex justify={"center"}>
          <Box maxW={"100vw"} w={"1000px"}>
            <Flex mt={10} gap={10} flexDir={{ base: "column", md: "row" }}>
              <Box
                w={{ base: "100%", md: "30%" }}
                border={"1px solid"}
                borderColor={"gray.200"}
                p={4}
                borderRadius={4}
                bg={"#fff"}
                h={"fit-content"}
                display={{ base: "flex", md: "block" }}
                justifyContent={{ base: "space-between" }}
              >
                {steps.map((item) => (
                  <Flex
                    key={item.Name}
                    align={"center"}
                    gap={2}
                    mb={3}
                    cursor={"pointer"}
                    onClick={() => {
                      handleNextStep(item.step);
                    }}
                    transition={"0.3s ease"}
                    flexDir={{ base: "column", md: "row" }}
                  >
                    <Box
                      p={2}
                      border={"1px solid"}
                      borderColor={
                        step === item.step ? "primary.text" : "gray.200"
                      }
                      borderRadius={4}
                      fontSize={18}
                      color={step === item.step ? "#fff" : "#000"}
                      bg={step === item.step ? "primary.text" : "transparent"}
                      transition={"0.3s ease"}
                    >
                      {item.icon}
                    </Box>
                    <Text
                      fontSize={14}
                      fontWeight={step === item.step ? "700" : "600"}
                      color={step === item.step ? "primary.text" : "gray.600"}
                      transition={"0.3s ease"}
                    >
                      {item.Name}
                    </Text>
                  </Flex>
                ))}
              </Box>
              <Box
                w={{ base: "100%", md: "70%" }}
                border={"1px solid"}
                borderColor={"gray.200"}
                p={3}
                px={4}
                borderRadius={4}
                bg={"#fff"}
                h={"fit-content"}
              >
                {ShowPage(step)}
              </Box>
            </Flex>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}

export default NewAppointment;

const Step1 = ({
  setStep,
  Doctordetails,
  setDoctordetails,
  appoinmentType,
  setAppointmentType,
}) => {
  const [deptID, setdeptID] = useState();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { settingsData } = useSettingsData();
  const stopBooking = settingsData?.find(
    (value) => value.id_name === "stop_booking"
  );

  const getDept = async () => {
    const res = await GET("get_department_active");
    return res.data;
  };
  const {
    isLoading: isDeptLoading,
    data: deptData,
    error: deptError,
  } = useQuery({
    queryKey: ["departments"],
    queryFn: getDept,
  });

  //   doctors
  const getData = async () => {
    const res = await GET("get_active_doctor");
    return res.data;
  };
  const {
    isLoading: docLoading,
    data: docData,
    error: docError,
  } = useQuery({
    queryKey: ["doctors"],
    queryFn: getData,
  });

  //

  const isDisableTypeButton = (ID, doc) => {
    switch (ID) {
      case 1:
        return doc.clinic_appointment;
      case 2:
        return doc.video_appointment;
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

  const FilterdDoc = (doc, deptID) => {
    const filtered = doc.filter((item) => item.department === deptID);
    if (deptID) {
      return filtered;
    } else {
      return doc;
    }
  };
  if (isDeptLoading || docLoading) {
    return <Loading />;
  }
  if (deptError || docError) {
    return <ErrorPage />;
  }
  return (
    <Box>
      <Box display={{ base: "none", md: "block" }} mb={4}>
        {" "}
        <Text fontSize={16} fontWeight={600} mb={1}>
          Select Category
        </Text>
        <Flex flexWrap={"wrap"} gap={3}>
          <Text
            cursor={"pointer"}
            py={"4px"}
            px={5}
            border={"2px solid"}
            borderColor={!deptID ? "primary.text" : "gray.300"}
            borderRadius={5}
            fontSize={13}
            fontWeight={!deptID ? "600" : "600"}
            color={!deptID ? "primary.text" : "#000"}
            onClick={() => {
              setdeptID();
            }}
          >
            All
          </Text>
          {deptData.map((dept) => (
            <Text
              cursor={"pointer"}
              key={dept.id}
              py={"4px"}
              px={5}
              border={"2px solid"}
              borderColor={deptID === dept.id ? "primary.text" : "gray.300"}
              borderRadius={5}
              fontSize={13}
              fontWeight={deptID === dept.id ? "600" : "600"}
              color={deptID === dept.id ? "primary.text" : "#000"}
              onClick={() => {
                setdeptID(dept.id);
              }}
              textTransform={"capitalize"}
              transition={"0.3s ease"}
            >
              {dept.title}
            </Text>
          ))}
        </Flex>
      </Box>

      {/* doctors */}
      <Box>
        <Text fontSize={16} fontWeight={600} mb={1}>
          Select Doctor
        </Text>

        <Box>
          <AnimatePresence>
            {FilterdDoc(docData, deptID).map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ marginBottom: "6px" }}
              >
                <motion.div
                  initial={{ height: "auto" }}
                  animate={{
                    height:
                      Doctordetails?.id === doc.id ? "auto" : "fit-content",
                  }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <Box
                    overflow={"hidden"}
                    p={2}
                    mb={5}
                    border={"1px solid"}
                    borderColor={
                      Doctordetails?.id === doc.id ? "primary.text" : "gray.300"
                    }
                    borderRadius={8}
                    cursor={
                      doc.stop_booking === 1 ||
                      stopBooking.value === true ||
                      stopBooking.value === "true"
                        ? "not-allowed"
                        : "pointer"
                    }
                    onClick={() => {
                      if (
                        doc.stop_booking === 1 ||
                        stopBooking.value === true ||
                        stopBooking.value === "true"
                      ) {
                        return;
                      }
                      setDoctordetails(
                        Doctordetails?.id === doc.id ? null : doc
                      );
                      setAppointmentType();
                    }}
                  >
                    <Flex align={"center"}>
                      <Box
                        overflow={"hidden"}
                        h={"80px"}
                        w={"80px"}
                        borderRadius={"50%"}
                        border={"8px solid #fff"}
                      >
                        <Image
                          src={
                            doc.image
                              ? `${imageBaseURL}/${doc.image}`
                              : "https://plus.unsplash.com/premium_photo-1661764878654-3d0fc2eefcca?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGRvY3RvcnxlbnwwfHwwfHx8MA%3D%3D"
                          }
                          fallbackSrc={"/user.png"}
                          w={{ base: "80px", md: "80px" }}
                        />
                      </Box>
                      <Box ml={4}>
                        <Text fontSize={15} fontWeight={600} m={0}>
                          {doc.f_name} {doc.l_name}
                        </Text>
                        <Text
                          mt={"2px"}
                          fontSize={{ base: "14px", md: "14px", lg: "14px" }}
                          fontWeight={600}
                          m={0}
                          color={"primary.text"}
                          fontFamily={"Quicksand, sans-serif"}
                        >
                          {doc.department_name}
                        </Text>
                      </Box>
                    </Flex>
                    {doc?.stop_booking === 1 ||
                      stopBooking.value === true ||
                      (stopBooking.value === "true" && (
                        <Alert
                          status="error"
                          size={"xs"}
                          py={1}
                          px={1}
                          mt={1}
                          w={"100%"}
                        >
                          <AlertIcon />
                          <AlertTitle fontSize={"xs"}>
                            {" "}
                            Currently Not Accepting Appointments
                          </AlertTitle>
                        </Alert>
                      ))}
                    <AnimatePresence>
                      {Doctordetails?.id === doc.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <Box mt={2}>
                            <Text fontSize={14} fontWeight={600}>
                              Appointment Type
                            </Text>
                            <Flex
                              gap={3}
                              mt={2}
                              overflow={"scroll"}
                              css={{
                                "&::-webkit-scrollbar": {
                                  display: "none",
                                },
                              }}
                            >
                              {feeData.map((fee) => (
                                <Box
                                  key={fee.id}
                                  align={"center"}
                                  padding={4}
                                  py={2}
                                  px={6}
                                  borderRadius={8}
                                  minW={120}
                                  color={
                                    appoinmentType?.id === fee.id
                                      ? "#fff"
                                      : isDisableTypeButton(fee?.id, doc) === 1
                                      ? "#fff"
                                      : "#fff"
                                  }
                                  _hover={{
                                    bg:
                                      isDisableTypeButton(fee?.id, doc) === 1
                                        ? "primary.text"
                                        : null,

                                    color: "#fff",
                                  }}
                                  bg={
                                    appoinmentType?.id === fee.id
                                      ? "primary.text"
                                      : isDisableTypeButton(fee?.id, doc) === 1
                                      ? "primary.bg"
                                      : "gray.300"
                                  }
                                  cursor={
                                    isDisableTypeButton(fee?.id, doc) === 1
                                      ? "pointer"
                                      : "not-allowed"
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!user) {
                                      onOpen();
                                    } else {
                                      if (
                                        isDisableTypeButton(fee?.id, doc) === 0
                                      ) {
                                        return;
                                      } else {
                                        setAppointmentType(
                                          appoinmentType?.id === fee?.id
                                            ? null
                                            : fee
                                        );
                                        setStep(fee?.id === 3 ? 3 : 2);
                                      }
                                    }
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
                                    {getfee(fee.title, doc)} {currency}
                                  </Text>
                                </Box>
                              ))}
                            </Flex>
                          </Box>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Box>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      </Box>

      {isOpen && <LoginModal isModalOpen={isOpen} onModalClose={onClose} />}
    </Box>
  );
};

const Step2 = ({
  appoinmentType,
  selectedDate,
  setSelectedDate,
  selectedSlot,
  setselectedSlot,
  setStep,
  Doctordetails,
}) => {
  const Calender15Days = () => {
    const next15Days = [];

    // Generate the next 15 days starting from today
    for (let i = 0; i < 15; i++) {
      const date = moment().add(i, "days").format("YYYY-MM-DD");
      next15Days.push(date);
    }
    return next15Days;
  };

  const getFormattedDate = (dateString) => {
    const date = moment(dateString, "YYYY-MM-DD");
    return {
      month: date.format("MMM"),
      date: date.format("DD"),
      year: date.format("ddd"),
    };
  };

  // get time slotes
  const getDayName = (dateString) => {
    const date = moment(dateString, "YYYYMMDD");
    return date.format("dddd");
  };

  // get doctors time slote
  const getData = async () => {
    const url =
      appoinmentType.title === "OPD"
        ? `get_doctor_time_interval/${Doctordetails.user_id}/${getDayName(
            selectedDate
          )}`
        : appoinmentType.title === "Video Consultant"
        ? `get_doctor_video_time_interval/${Doctordetails.user_id}/${getDayName(
            selectedDate
          )}`
        : `get_doctor_time_interval/${Doctordetails.user_id}/${getDayName(
            selectedDate
          )}`;
    const res = await GET(url);

    return res.data;
  };

  const { isLoading: timeSlotesLoading, data: timeSlots } = useQuery({
    queryKey: [
      "timeslotes",
      selectedDate,
      Doctordetails.user_id,
      appoinmentType?.title,
    ],
    queryFn: getData,
    enabled: !!selectedDate,
  });

  const filterIntervals = (intervals) => {
    const today = moment().format("YYYY-MM-DD");
    if (selectedDate === today) {
      const currentTime = new Date();
      return intervals?.filter((interval) => {
        const [hours, minutes] = interval.time_start.split(":");
        const intervalTime = new Date();
        intervalTime.setHours(hours, minutes, 0, 0);
        // Set hours and minutes, reset seconds and milliseconds
        return intervalTime > currentTime; // Compare interval start time with current time
      });
    } else {
      return intervals;
    }
  };

  const filteredIntervals = filterIntervals(timeSlots);

  // get doctors booked slotes
  const getBookedSlotes = async () => {
    const res = await GET(
      `get_booked_time_slots?doct_id=${Doctordetails.user_id}&date=${moment(
        selectedDate
      ).format("YYYY-MM-DD")}&type=${appoinmentType.title}`
    );
    return res.data;
  };

  const { isLoading: bookedSlotesLoading, data: bookedSlotes } = useQuery({
    queryKey: [
      "bookedslotes",
      selectedDate,
      Doctordetails.user_id,
      appoinmentType?.title,
    ],
    queryFn: getBookedSlotes,
    enabled: !!selectedDate,
    retry: false,
  });

  // get slot is booked or not
  const getSlotStatus = (slot) => {
    let slotAvailable = true;

    bookedSlotes?.forEach((bookedSlot) => {
      if (
        bookedSlot.time_slots === slot.time_start &&
        bookedSlot.date === selectedDate
      ) {
        slotAvailable = false;
      }
    });

    return slotAvailable;
  };

  // react slick

  const swiperParams = {
    spaceBetween: 20,
    centeredSlides: false,
    loop: false,
    slidesPerView: 7.5,
    breakpoints: {
      1024: { spaceBetween: 5, slidesPerView: 7.5 },
      768: { spaceBetween: 5, slidesPerView: 6.5 },
      640: {
        spaceBetween: 5,
        slidesPerView: 5.5,
      },
      320: {
        spaceBetween: 5,
        slidesPerView: 5.5,
      },
    },
  };

  return (
    <Box>
      {timeSlotesLoading && bookedSlotesLoading && <Loading />}
      <Text fontSize={17} fontWeight={600} mb={3}>
        Date & Time
      </Text>{" "}
      <Divider mb={5} />
      <Box maxW={"100%"} overflow={"hidden"}>
        {" "}
        <Swiper
          {...swiperParams}
          style={{ cursor: "grab", overflow: "hidden", maxWidth: "100%" }}
        >
          {Calender15Days().map((day, index) => (
            <SwiperSlide key={index}>
              <Box
                key={index}
                onClick={() => {
                  setSelectedDate(moment(day).format("YYYY-MM-DD"));
                }}
              >
                {" "}
                <Box
                  bg={
                    selectedDate === moment(day).format("YYYY-MM-DD")
                      ? "primary.text"
                      : "blue.700"
                  }
                  mr={3}
                  borderRadius={5}
                  color={"#fff"}
                  p={1}
                  cursor={"pointer"}
                >
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    color="gray.100"
                    textAlign="center"
                    m={0}
                  >
                    {getFormattedDate(day).month}
                  </Text>
                  <Text
                    fontSize="md"
                    fontWeight="700"
                    color="blue.100"
                    textAlign="center"
                    m={0}
                  >
                    {getFormattedDate(day).date}
                  </Text>
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    color="gray.100"
                    textAlign="center"
                    m={0}
                  >
                    {getFormattedDate(day).year}
                  </Text>
                </Box>
              </Box>
            </SwiperSlide>
          ))}
        </Swiper>
      </Box>
      <Box>
        {selectedDate ? (
          <Box
            mt={5}
            border={"1px solid"}
            borderColor={"gray.200"}
            p={2}
            borderRadius={4}
          >
            <Text textAlign={"left"} fontWeight={600} fontSize={16} mb={1}>
              Time Slotes
            </Text>

            {filteredIntervals?.length ? (
              <Box mt={2}>
                <SimpleGrid columns={[3, 4, 5]} spacing={2}>
                  {filteredIntervals?.map((slot, index) => (
                    <Button
                      key={index}
                      size="sm"
                      fontSize="xs"
                      fontWeight={600}
                      colorScheme={
                        !getSlotStatus(slot)
                          ? "red"
                          : slot === selectedSlot
                          ? "blue"
                          : "green"
                      }
                      variant="solid"
                      onClick={() => {
                        if (!getSlotStatus(slot)) {
                          return;
                        }
                        setselectedSlot(slot);
                        setStep(3);
                      }}
                      isDisabled={!getSlotStatus(slot)}
                      _disabled={{
                        backgroundColor: "red.500",
                      }}
                    >
                      {slot.time_start} - {slot.time_end}
                    </Button>
                  ))}
                </SimpleGrid>
              </Box>
            ) : (
              <Text color={"red.400"} fontWeight={700} fontSize={"sm"}>
                Sorry , no available time slotes ware found for the selected
                date.
              </Text>
            )}
          </Box>
        ) : (
          ""
        )}
      </Box>
    </Box>
  );
};

const Step3 = ({ setPatientDetails, setStep }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { register, handleSubmit } = useForm();
  const [addNew, setaddNew] = useState(false);
  const [isd_code, setisd_code] = useState(defaultISD);
  const [isUserAddLoading, setisUserAddLoading] = useState(false);
  const toast = useToast();
  const QueryClient = useQueryClient();

  //
  const getData = async () => {
    const res = await GET(`get_family_members/user/${user?.id}`);
    return res.data;
  };
  const { isLoading: patientLoading, data: patientData } = useQuery({
    queryKey: ["family-members", user?.id],
    queryFn: getData,
    enabled: !!user?.id,
  });

  if (patientLoading) {
    return <Loading />;
  }

  // API CALL
  const onSubmit = async (data) => {
    let apiData = {
      ...data,
      isd_code: isd_code,
      user_id: user.id,
    };

    try {
      setisUserAddLoading(true);
      const res = await ADD(user.token, "add_family_member", apiData);
      console.log(res);
      showToast(toast, "success", "Success");
      QueryClient.invalidateQueries({ queryKey: ["family-members", user?.id] });
      setaddNew(false);
      setPatientDetails({ ...data, id: res.id });
      setStep(4);
    } catch (error) {
      console.log(error);
      setisUserAddLoading(false);
      showToast(toast, "error", "something went wrong");
    }
  };

  return (
    <Box>
      {" "}
      {addNew ? (
        <Box>
          <Text fontSize={18} fontWeight={600} mb={3} textAlign={"center"}>
            Add New family member
          </Text>{" "}
          <Divider />
          <Box mt={5} as="form" onSubmit={handleSubmit(onSubmit)}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <FormControl isRequired>
                <FormLabel>First Name</FormLabel>
                <Input
                  type="text"
                  size={"sm"}
                  fontSize={16}
                  {...register("f_name", { required: true })}
                />
              </FormControl>
              <FormControl mt={5} isRequired>
                <FormLabel>Last Name</FormLabel>
                <Input
                  type="text"
                  size={"sm"}
                  fontSize={16}
                  {...register("l_name", { required: true })}
                />
              </FormControl>

              <FormControl mt={5} isRequired>
                <FormLabel>Phone </FormLabel>
                <InputGroup size={"sm"}>
                  <InputLeftAddon
                    cursor={"pointer"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen();
                    }}
                  >
                    {isd_code}
                  </InputLeftAddon>
                  <Input
                    type="Tel"
                    fontSize={16}
                    {...register("phone", { required: true })}
                  />
                </InputGroup>
              </FormControl>
              <Flex w={"full"} gap={4} mt={5}>
                <FormControl id="gender">
                  <FormLabel>Gender</FormLabel>
                  <Select {...register("gender", { required: true })}>
                    <option value={"Male"}>Male</option>
                    <option value={"Female"}>Female</option>
                  </Select>
                </FormControl>
                <FormControl id="dob">
                  <FormLabel>Date of Birth</FormLabel>
                  <Input
                    type="date"
                    {...register("dob", { required: true })}
                    onFocus={(e) => e.target.showPicker()}
                    onClick={(e) => e.target.showPicker()}
                  />
                </FormControl>
              </Flex>
            </motion.div>

            <Flex gap={5} justify={"end"} mt={8}>
              <Button w={"30%"} size={"sm"} onClick={() => setaddNew(false)}>
                Cancle
              </Button>
              <Button
                w={"40%"}
                size={"sm"}
                colorScheme="green"
                type="submit"
                isLoading={isUserAddLoading}
              >
                Add
              </Button>
            </Flex>
          </Box>
        </Box>
      ) : (
        <Box>
          <Text fontSize={17} fontWeight={600} mb={3}>
            Who is this appointment for?
          </Text>{" "}
          <Box>
            <AnimatePresence>
              {" "}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {" "}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card
                    cursor={"pointer"}
                    mb={4}
                    borderColor={"blue.400"}
                    borderWidth={1}
                    onClick={() => {
                      setPatientDetails({ ...user, selectionType: "self" });
                      setStep(4);
                    }}
                  >
                    <CardBody p={4}>
                      <Flex align={"center"} gap={4}>
                        <FaUser fontSize={24} color="#3182CE" />
                        <Box>
                          <Flex align={"center"} gap={2}>
                            <Text fontSize={14} fontWeight={600} mb={0}>
                              {user?.f_name} {user?.l_name}
                            </Text>
                            <Badge colorScheme="blue" fontSize={11}>
                              You
                            </Badge>
                          </Flex>
                          <Text fontSize={14} fontWeight={600}>
                            {user?.phone}
                          </Text>
                        </Box>
                      </Flex>
                    </CardBody>
                  </Card>
                </motion.div>
                {patientData && patientData.length > 0 && (
                  <Box>
                    {patientData.map((patient) => (
                      <motion.div
                        key={patient.id}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                      >
                        <Card
                          cursor={"pointer"}
                          mb={4}
                          onClick={() => {
                            setPatientDetails(patient);
                            setStep(4);
                          }}
                        >
                          <CardBody p={4}>
                            <Flex align={"center"} gap={4}>
                              <FaUser fontSize={24} color="#2D3748" />
                              <Box>
                                {" "}
                                <Text fontSize={14} fontWeight={600} mb={0}>
                                  {patient.f_name} {patient.l_name}
                                </Text>{" "}
                                <Text fontSize={14} fontWeight={600}>
                                  {patient.phone}
                                </Text>{" "}
                              </Box>
                            </Flex>
                          </CardBody>
                        </Card>
                      </motion.div>
                    ))}
                  </Box>
                )}
                <Button
                  align="center"
                  leftIcon={<BsPersonAdd fontSize={20} />}
                  colorScheme="green"
                  variant={"outline"}
                  size={"sm"}
                  w={"100%"}
                  mt={2}
                  onClick={() => {
                    setaddNew(true);
                  }}
                >
                  Add Family Member
                </Button>
              </motion.div>
            </AnimatePresence>
          </Box>
        </Box>
      )}
      <ISDCODEMODAL
        isOpen={isOpen}
        onClose={onClose}
        setisd_code={setisd_code}
      />
    </Box>
  );
};

const getUserDetails = async () => {
  try {
    const userRes = await GET_AUTH(user.token, "patient/me");
    if (userRes.response !== 200 && userRes.status !== true) return null;
    return userRes.data;
  } catch {
    return null;
  }
};

const Step4 = ({
  patientDetails,
  Doctordetails,
  selectedDate,
  selectedSlot,
  appoinmentType,
  setAllNull,
}) => {
  const { settingsData } = useSettingsData();
  const tax = settingsData?.find((value) => value.id_name === "tax");
  const toast = useToast();
  const [isLoading, setisLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [method, setMethod] = useState("2");
  const [coupon, setcoupon] = useState();
  const [SelectedCoupon, setSelectedCoupon] = useState();
  const [bookingError, setBookingError] = useState(null);
  const { paymentGetwaysData } = PaymentGetwayData();
  const [paymentMethod, setPaymentMethod] = useState(null);
  useEffect(() => {
    if (paymentGetwaysData) {
      setPaymentMethod(paymentGetwaysData.title.toLowerCase());
    }
  }, [paymentGetwaysData]);

  const timePassed = (selectedSlot) => {
    const today = moment().format("YYYY-MM-DD");
    if (selectedDate === today) {
      const currentTime = new Date();
      const { time_end } = selectedSlot;
      const [hours, minutes] = time_end.split(":");
      const endTime = new Date();
      endTime.setHours(hours, minutes, 0, 0);
      return endTime < currentTime; // Check if the end time of the slot is before the current time
    } else {
      return false; // If not today, the time has not passed
    }
  };

  const getBookedSlotes = async () => {
    const res = await GET(
      `get_booked_time_slots?doct_id=${Doctordetails.user_id}&date=${moment(
        selectedDate
      ).format("YYYY-MM-DD")}&type=${appoinmentType.title}`
    );
    return res.data;
  };

  const { isLoading: bookedSlotesLoading, data: bookedSlotes } = useQuery({
    queryKey: [
      "bookedslotes",
      selectedDate,
      Doctordetails.user_id,
      appoinmentType?.title,
    ],
    queryFn: getBookedSlotes,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
    retry: false,
  });

  // get slot is booked or not
  const getSlotStatus = (slot) => {
    let slotAvailable = true;
    bookedSlotes?.forEach((bookedSlot) => {
      if (
        bookedSlot.time_slots === slot.time_start &&
        bookedSlot.date === selectedDate
      ) {
        slotAvailable = false;
      }
    });
    return slotAvailable;
  };

  // get user data fresh
  const { isLoading: isUserLoading, data: userData } = useQuery({
    queryKey: ["user"],
    queryFn: getUserDetails,
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when the component mounts
    staleTime: 0,
  });

  const getfee = (type, doc) => {
    const feeSource = doc || {};
    switch (type) {
      case "OPD":
        return Number(feeSource.opd_fee) || 0;
      case "Video Consultant":
        return Number(feeSource.video_fee) || 0;
      case "Emergency":
        return Number(feeSource.emg_fee) || 0;
      default:
        return Number(feeSource.emg_fee) || 0;
    }
  };

  const taxAmount = (amount) => {
    return (Number(amount) * (Number(tax.value) || 0)) / 100;
  };
  const discountAmount = (amount, value) => {
    if (value) {
      return (Number(amount) * Number(value)) / 100;
    } else {
      return 0;
    }
  };
  const getTotal = (amount, taxAmount, discount) => {
    return Number(amount) - Number(discount) + Number(taxAmount);
  };

  const feeAmount = Number(getfee(appoinmentType.title, Doctordetails)) || 0;
  const unitTaxAmount = taxAmount(feeAmount);
  const couponOffAmount = discountAmount(feeAmount, SelectedCoupon?.value);
  const unitTotalAmount = getTotal(feeAmount, unitTaxAmount, 0);

  const payableTotal = Number(
    getTotal(
      feeAmount,
      unitTaxAmount,
      couponOffAmount
    ).toFixed(2)
  );
  const walletAvailable = Number(userData?.wallet_amount || 0);
  const isWalletInsufficient = walletAvailable < payableTotal;

  const buildAppointmentDetails = ({
    selectedMethod = Number(method),
    paymentTransactionId,
    paymentMethodOverride,
    paymentStatusOverride,
    statusOverride,
  } = {}) => ({
    family_member_id: patientDetails.id,
    status: statusOverride || (selectedMethod === 2 ? "Pending" : "Confirmed"),
    date: selectedDate ? selectedDate : moment().format("YYYY-MM-DD"),
    time_slots: selectedSlot ? selectedSlot.time_start : moment().format("hh:mm"),
    doct_id: Doctordetails.user_id,
    dept_id: Doctordetails.department,
    type: appoinmentType.title,
    payment_status:
      paymentStatusOverride || (selectedMethod === 2 ? "Unpaid" : "Paid"),
    fee: feeAmount,
    service_charge: 0,
    tax: tax.value,
    unit_tax_amount: unitTaxAmount,
    total_amount: payableTotal,
    unit_total_amount: unitTotalAmount,
    invoice_description: appoinmentType.title,
    user_id: user.id,
    payment_method:
      paymentMethodOverride ||
      (selectedMethod === 1
        ? "Online"
        : selectedMethod === 3
        ? "Wallet"
        : null),
    payment_transaction_id:
      paymentTransactionId || (selectedMethod === 3 ? "Wallet" : null),
    is_wallet_txn:
      (paymentMethodOverride || (selectedMethod === 3 ? "Wallet" : "")) ===
      "Wallet"
        ? 1
        : 0,
    source: "Web",
    coupon_id: SelectedCoupon?.id,
    coupon_title: SelectedCoupon?.title,
    coupon_value: SelectedCoupon?.value,
    coupon_off_amount: couponOffAmount,
  });

  const addAppointment = async (options = {}) => {
    if (!patientDetails?.id || !Doctordetails?.user_id || !selectedSlot?.time_start) {
      showToast(
        toast,
        "error",
        "Booking details are incomplete. Please reselect date, slot, and patient."
      );
      return null;
    }

    if (!user?.token) {
      showToast(toast, "error", "Session expired. Please log in and try again.");
      return null;
    }

    try {
      const appointmentDetails = buildAppointmentDetails(options);
      setisLoading(true);
      let res = await ADD(user.token, "add_appointment", appointmentDetails);
      console.log("[booking] response:", res);
      setisLoading(false);
      if (res.response === 200 || res?.status === true || res?.success === true) {
        const appointmentId =
          res?.id ||
          res?.appointment_id ||
          res?.data?.id ||
          res?.data?.appointment_id ||
          res?.appointment?.id ||
          null;
        const savedStatus =
          res?.data?.status || res?.appointment?.status || appointmentDetails.status;
        const savedPaymentStatus =
          res?.data?.payment_status ||
          res?.appointment?.payment_status ||
          appointmentDetails.payment_status;
        const successMessage =
          savedStatus === "Pending" || savedPaymentStatus === "Unpaid"
            ? "Appointment submitted. Status: Pending. Payment is due at the hospital."
            : "Appointment booked successfully. Status: Confirmed.";

        if (!appointmentId) {
          showToast(
            toast,
            "warning",
            "Booking may be saved, but appointment ID was not returned. Please check your appointments list."
          );
          setAllNull();
          queryClient.invalidateQueries({ queryKey: ["timeslotes"] });
          queryClient.invalidateQueries({ queryKey: ["bookedslotes"] });
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          queryClient.invalidateQueries({ queryKey: ["user"] });
          navigate("/appointments");
          return res;
        }

        clearPendingAppointmentPayment();
        setBookingError(null);
        showToast(toast, "success", successMessage);
        setAllNull();
        queryClient.invalidateQueries({ queryKey: ["timeslotes"] });
        queryClient.invalidateQueries({ queryKey: ["bookedslotes"] });
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
        navigate(`/appointment-success/${appointmentId}`);
        return res;
      } else {
        if (res?.sessionExpired) {
          showToast(toast, "error", "Your session has expired. Please log in again.");
          setTimeout(() => logoutFn(), 1500);
          return null;
        }
        const errMsg = res?.message || "Unable to save appointment. Please try again.";
        setBookingError(errMsg);
        showToast(toast, "error", errMsg);
        queryClient.invalidateQueries({ queryKey: ["timeslotes"] });
        queryClient.invalidateQueries({ queryKey: ["bookedslotes"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
        return null;
      }
    } catch (error) {
      setisLoading(false);
      const errMsg = error?.message || "Something went wrong. Please try again.";
      setBookingError(errMsg);
      showToast(toast, "error", errMsg);
      return null;
    }
  };

  if (!patientDetails) return null;

  const paymentData = {
    family_member_id: String(patientDetails.id), // Ensure this is a string
    status: "Confirmed",
    date: selectedDate ? selectedDate : moment().format("YYYY-MM-DD"),
    time_slots: selectedSlot
      ? selectedSlot.time_start
      : moment().format("hh:mm"),
    doct_id: String(Doctordetails.user_id), // Convert to string
    dept_id: String(Doctordetails.department), // Convert to string
    type: appoinmentType.title,
    payment_status: "Paid",
    fee: String(feeAmount.toFixed(2)), // Convert to string
    service_charge: "0.0", // Ensure this is a string with decimal
    tax: String(tax.value), // Convert to string
    unit_tax_amount: String(
      unitTaxAmount.toFixed(2)
    ), // String and formatted
    total_amount: String(payableTotal.toFixed(2)), // Ensure string and formatted
    unit_total_amount: String(unitTotalAmount.toFixed(2)), // String and formatted
    invoice_description: appoinmentType.title,
    user_id: String(user.id), // Convert to string
    payment_method: "Online",
    is_wallet_txn: String(0), // Convert to string
    source: "Web", // Ensure this matches the app source
    coupon_id: SelectedCoupon?.id ? String(SelectedCoupon?.id) : "", // Ensure it's a string or empty
    coupon_title: SelectedCoupon?.title || "", // Ensure it's a string or empty
    coupon_value: SelectedCoupon?.value ? String(SelectedCoupon?.value) : "", // String or empty
    coupon_off_amount: String(couponOffAmount.toFixed(2)), // Ensure string and formatted
    name: `${patientDetails.f_name} ${patientDetails.l_name}`,
    desc: "Appointment",
  };

  // add appoinment
  const nextfn = async (paymentId) => {
    await addAppointment({
      selectedMethod: 1,
      paymentTransactionId: paymentId || "Online",
      paymentMethodOverride: paymentMethod || "Online",
      paymentStatusOverride: "Paid",
      statusOverride: "Confirmed",
    });
  };

  // payment data

  if (isLoading || isUserLoading || bookedSlotesLoading) {
    return <Loading />;
  }
  return (
    <Box>
      <Flex justify={"center"} mb={2}>
        {" "}
        <Image src="/appoinment.png" w={100} />
      </Flex>
      <Text fontSize={14} fontWeight={500} textAlign={"center"}>
        Only One Step Away
      </Text>{" "}
      <Text fontSize={14} fontWeight={500} textAlign={"center"}>
        Pay And Book your Appointment
      </Text>{" "}
      <Divider my={2} />
      <Box w={{ base: "100%", md: "100%" }}>
        <Flex justify={"space-between"} mb={1}>
          {" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            Doctor
          </Text>{" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            {Doctordetails.f_name} {Doctordetails.l_name}
          </Text>{" "}
        </Flex>
        <Flex justify={"space-between"} mb={1}>
          {" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            Patient
          </Text>{" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            {patientDetails.f_name} {patientDetails.l_name}
            {patientDetails.selectionType === "self" && (
              <Badge colorScheme="blue" ml={1} fontSize={11}>
                You
              </Badge>
            )}
          </Text>{" "}
        </Flex>
        <Flex justify={"space-between"} mb={1}>
          {" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            Appointment Type
          </Text>{" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            {appoinmentType.title}
          </Text>{" "}
        </Flex>
        <Flex justify={"space-between"} mb={1}>
          {" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            Date & Time
          </Text>{" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            {selectedDate ? selectedDate : moment().format("YYYY-MM-DD")}{" "}
            {selectedSlot
              ? moment(selectedSlot.time_start, "hh:mm").format("hh:mm A")
              : ""}
          </Text>{" "}
        </Flex>
        <Flex justify={"space-between"} mb={1}>
          {" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            Appointment Fee
          </Text>{" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            {getfee(appoinmentType.title, Doctordetails)} {currency}
          </Text>{" "}
        </Flex>
        <Flex justify={"space-between"} mb={1}>
          {" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            Tax
          </Text>{" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            {taxAmount(getfee(appoinmentType.title, Doctordetails))} {currency}
          </Text>{" "}
        </Flex>
        <Flex justify={"space-between"} mb={1}>
          {" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            Applied Coupon
          </Text>{" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            {SelectedCoupon?.title || ""}
          </Text>{" "}
        </Flex>
        <Flex justify={"space-between"} mb={1}>
          {" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            Coupon Discount
          </Text>{" "}
          <Text
            fontSize={15}
            fontWeight={500}
            textAlign={"center"}
            color={"gray.600"}
          >
            {discountAmount(
              getfee(appoinmentType.title, Doctordetails),
              SelectedCoupon?.value
            )}{" "}
            {currency}
          </Text>{" "}
        </Flex>
      </Box>
      <Divider my={1} />
      <Box w={{ base: "100%", md: "100%" }}>
        <Flex justify={"space-between"} mb={1}>
          {" "}
          <Text
            fontSize={16}
            fontWeight={600}
            textAlign={"center"}
            color={"gray.800"}
          >
            Total
          </Text>{" "}
          <Text
            fontSize={16}
            fontWeight={600}
            textAlign={"center"}
            color={"gray.800"}
          >
            {getTotal(
              getfee(appoinmentType.title, Doctordetails).toFixed(2),
              taxAmount(getfee(appoinmentType.title, Doctordetails).toFixed(2)),
              discountAmount(
                getfee(appoinmentType.title, Doctordetails),
                SelectedCoupon?.value
              )
            )}{" "}
            {currency}
          </Text>{" "}
        </Flex>
        {method == 1 && (
          <Flex
            gap={5}
            mt={5}
            justifyContent={{ base: "space-between", md: "left" }}
          >
            <Input
              placeholder="Apply Coupon"
              w={250}
              size={"sm"}
              borderRadius={8}
              onChange={(e) => {
                setcoupon(e.target.value);
              }}
              value={coupon}
            />
            <Button size={"sm"} onClick={ValidateCoupon}>
              Apply
            </Button>
          </Flex>
        )}

        <Box mt={5}>
          <RadioGroup value={method} fontWeight={500} size={"md"}>
            <Stack>
              {paymentMethod === "stripe" && (
                <Radio
                  value={"1"}
                  fontWeight={700}
                  onChange={(e) => {
                    setcoupon(null);
                    setSelectedCoupon(null);
                    setMethod(e.target.value);
                  }}
                >
                  Pay Now
                </Radio>
              )}
              {appoinmentType.id !== 2 && (
                <Radio
                  value={"2"}
                  fontWeight={700}
                  onChange={(e) => {
                    setcoupon(null);
                    setSelectedCoupon(null);
                    setMethod(e.target.value);
                  }}
                >
                  Pay At Hospital
                </Radio>
              )}

              <Radio
                value={"3"}
                fontWeight={700}
                isDisabled={isWalletInsufficient}
                onChange={(e) => {
                  setcoupon(null);
                  setSelectedCoupon(null);
                  setMethod(e.target.value);
                }}
              >
                Pay From Wallet (Available Balance {currency}
                {userData?.wallet_amount})
              </Radio>
            </Stack>
          </RadioGroup>
        </Box>

        <Button
          size={"sm"}
          w={"100%"}
          colorScheme="green"
          mt={5}
          onClick={() => {
            if (!getSlotStatus(selectedSlot)) {
              showToast(
                toast,
                "error",
                "Slot already Booked! , Please Try another slot"
              );
              return;
            }
            if (timePassed(selectedSlot)) {
              showToast(
                toast,
                "error",
                "Time Passed! , Please Try another slot"
              );
              return;
            }

            if (method == 3 && isWalletInsufficient) {
              showToast(
                toast,
                "error",
                `Insufficient wallet balance. Please load ${currency}${(
                  payableTotal - walletAvailable
                ).toFixed(2)} or more before booking.`
              );
              return;
            }

            if (method == 1) {
              if (paymentMethod !== "stripe") {
                showToast(
                  toast,
                  "error",
                  "Online payment is currently unavailable. Please select 'Pay At Hospital' to proceed."
                );
                return;
              }
              onOpen();
            } else {
              addAppointment();
            }
          }}
        >
          Pay {currency}
          {getTotal(
            getfee(appoinmentType.title, Doctordetails).toFixed(2),
            taxAmount(getfee(appoinmentType.title, Doctordetails).toFixed(2)),
            discountAmount(
              getfee(appoinmentType.title, Doctordetails),
              SelectedCoupon?.value
            )
          ).toFixed(2)}
        </Button>
        {bookingError && (
          <Alert status="error" mt={3} borderRadius={8} fontSize={13}>
            <AlertIcon />
            <AlertTitle>{bookingError}</AlertTitle>
          </Alert>
        )}
      </Box>
      {isOpen ? (
        <>
          {paymentMethod === "stripe" && (
            <StripePaymentController
              isOpen={isOpen}
              onClose={onClose}
              nextFn={nextfn}
              data={paymentData}
              cancelFn={() => onClose()}
              type={"Appointment"}
            />
          )}
          {/* Razorpay is disabled */}
        </>
      ) : null}
    </Box>
  );
};
