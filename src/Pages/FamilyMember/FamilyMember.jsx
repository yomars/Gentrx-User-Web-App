import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  VStack,
  InputGroup,
  InputLeftElement,
  useColorModeValue,
  Divider,
  Select, Text,
  useDisclosure,
  InputLeftAddon,
  useToast,
  Heading,
  theme,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  Card,
  CardBody
} from "@chakra-ui/react";
import { GET, UPDATE } from "../../Controllers/ApiControllers";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "../../Components/Loading";
import ErrorPage from "../ErrorPage";
import { useForm } from "react-hook-form";
import { BsEnvelope, BsPerson } from "react-icons/bs";
import { useEffect, useRef, useState } from "react";
import ISDCODEMODAL from "../../Components/ISDCODEMODAL";
import defaultISD from "../../Controllers/defaultISD";
import user from "../../Controllers/user";
import showToast from "../../Controllers/ShowToast";
import moment from "moment";
import { BiDonateHeart } from "react-icons/bi";
import BloodPressure from "../Vitals/BloodPressure";
import { MdBloodtype } from "react-icons/md";
import BloodSugar from "../Vitals/BloodSugar";
import { FaThermometer, FaWeight } from "react-icons/fa";
import Weight from "../Vitals/Weigjht";
import Temperature from "../Vitals/Temp";
import { SiOxygen } from "react-icons/si";
import SpO2 from "../Vitals/Spo2";
import DateRangePicker from "@wojtekmaj/react-daterange-picker";
import "@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css";
import "react-calendar/dist/Calendar.css";
import { AiFillCaretDown, AiFillCaretRight } from "react-icons/ai";
import { motion } from "framer-motion";

const getLast7DaysRange = () => {
  const endDate = moment().startOf("day");
  const startDate = moment().subtract(7, "days").startOf("day");
  return [startDate.toDate(), endDate.toDate()];
};
const handleUpdate = async (data) => {
  const res = await UPDATE(user.token, "update_family_member", data);
  if (res.response !== 200) {
    throw new Error(res.message);
  }
  return res;
};
function FamilyMember() {
  const { id } = useParams();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isd_code, setIsd_code] = useState(defaultISD);
  const { register, handleSubmit, reset } = useForm();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [Range, setRange] = useState(getLast7DaysRange());
  const dateRangePickerRef = useRef(null);

  const startDate = moment(Range[0]).format("YYYY-MM-DD");
  const endData = moment(Range[1]).format("YYYY-MM-DD");

  const getData = async () => {
    const res = await GET(`get_family_members/${id}`);
    console.log(res);
    return res.data;
  };
  const { data, isLoading, error } = useQuery({
    queryKey: ["family-member", id],
    queryFn: getData,
  });

  const vitalsArr = [
    {
      name: "Blood-Pressure",
      icon: <BiDonateHeart fontSize={20} color={theme.colors.green[600]} />,
      description: "Blood Pressure details and history",
      box: (
        <BloodPressure
          selectedMember={data}
          startDate={startDate}
          endDate={endData}
        />
      ),
    },
    {
      name: "Blood-Sugar",
      icon: <MdBloodtype fontSize={20} color={theme.colors.green[600]} />,
      description: "Blood Sugar levels and insights.",
      box: (
        <BloodSugar
          selectedMember={data}
          startDate={startDate}
          endDate={endData}
        />
      ),
    },
    {
      name: "Weight",
      icon: <FaWeight fontSize={20} color={theme.colors.green[600]} />,
      description: "Weight tracking .",
      box: (
        <Weight selectedMember={data} startDate={startDate} endDate={endData} />
      ),
    },
    {
      name: "Temperature",
      icon: <FaThermometer fontSize={20} color={theme.colors.green[600]} />,
      description: "Body temperature monitoring.",
      box: (
        <Temperature
          selectedMember={data}
          startDate={startDate}
          endDate={endData}
        />
      ),
    },
    {
      name: "SpO2",
      icon: <SiOxygen fontSize={20} color={theme.colors.green[600]} />,
      description: "Oxygen saturation levels.",
      box: (
        <SpO2 selectedMember={data} startDate={startDate} endDate={endData} />
      ),
    },
  ];

  useEffect(() => {
    if (data) {
      reset({
        f_name: data.f_name || "",
        l_name: data.l_name || "",
        email: data.email || "",
        phone: data.phone || "",
        gender: data.gender || "Male",
        dob: data.dob || "",
        city: data.city || "",
        state: data.state || "",
        postal_code: data.postal_code || "",
        address: data.address || "",
      });
      setIsd_code(data.isd_code || defaultISD);
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      await handleUpdate(data);
    },
    onSuccess: () => {
      showToast(toast, "success", "Family Member Updated");
      queryClient.invalidateQueries(["family-members"]);
      queryClient.invalidateQueries(["family-member", id]);
    },
    onError: (error) => {
      showToast(toast, "error", error.message);
    },
  });

  const onSubmit = (data) => {
    let formData = {
      id: id,
      isd_code: isd_code,
      ...data,
    };
    mutation.mutate(formData);
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;
  return (
    <Box>
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "10" }}>
        <Box className="container">
          <Text
            fontSize={{ base: 18, md: 32 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Family Member
          </Text>
        </Box>
      </Box>
      <Box className="container" maxW={"700px"}>
        {data ? (
          <>
            {" "}
            <Box
              w={"full"}
              // eslint-disable-next-line react-hooks/rules-of-hooks
              bg={useColorModeValue("white", "gray.800")}
              boxShadow={"xl"}
              rounded={"lg"}
              mt={5}
              borderRadius={8}
              overflow={"hidden"}
            >
              <VStack
                as="form"
                onSubmit={handleSubmit(onSubmit)}
                mt={1}
                spacing={4}
                p={6}
              >
                <Flex
                  w="full"
                  gap={4}
                  mt={2}
                  flexDir={{ base: "column", md: "row" }}
                >
                  <FormControl id="f_name" isRequired>
                    <FormLabel>First Name</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <BsPerson color="gray.800" />
                      </InputLeftElement>
                      <Input
                        type="text"
                        {...register("f_name", { required: true })}
                      />
                    </InputGroup>
                  </FormControl>

                  <FormControl id="l_name" isRequired>
                    <FormLabel>Last Name</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <BsPerson color="gray.800" />
                      </InputLeftElement>
                      <Input
                        type="text"
                        {...register("l_name", { required: true })}
                      />
                    </InputGroup>
                  </FormControl>
                </Flex>
                <Flex w="full" gap={4} flexDir={{ base: "column", md: "row" }}>
                  <FormControl id="phone" isRequired>
                    <FormLabel>Phone</FormLabel>
                    <InputGroup>
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
                        type="tel"
                        isReadOnly
                        {...register("phone", { required: true })}
                      />
                    </InputGroup>
                  </FormControl>
                  <FormControl id="email">
                    <FormLabel>Email</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <BsEnvelope color="gray.800" />
                      </InputLeftElement>
                      <Input
                        type="email"
                        {...register("email", {
                          pattern: {
                            value:
                              /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                            message: "Invalid email address",
                          },
                        })}
                      />
                    </InputGroup>
                  </FormControl>
                </Flex>

                <Flex w={"full"} gap={4}>
                  <FormControl id="gender" isRequired>
                    <FormLabel>Gender</FormLabel>
                    <Select {...register("gender", { required: true })}>
                      <option value={"Male"}>Male</option>
                      <option value={"Female"}>Female</option>
                    </Select>
                  </FormControl>
                  <FormControl id="dob" isRequired>
                    <FormLabel>Date of Birth</FormLabel>
                    <Input
                      type="date"
                      {...register("dob", { required: true })}
                      onFocus={(e) => e.target.showPicker()}
                      onClick={(e) => e.target.showPicker()}
                    />
                  </FormControl>
                </Flex>

                <Button
                  size={"sm"}
                  type="submit"
                  w={"full"}
                  bg={"green.500"}
                  color={"white"}
                  rounded={"md"}
                  _hover={{
                    bg: "green.600",
                  }}
                  isLoading={mutation.isPending}
                  mt={5}
                >
                  Update Profile
                </Button>
              </VStack>
            </Box>
            {/* vitals */}
            <Box
              w={"full"}
              // eslint-disable-next-line react-hooks/rules-of-hooks
              bg={useColorModeValue("white", "gray.800")}
              boxShadow={"xl"}
              rounded={"lg"}
              mt={5}
              borderRadius={8}
              p={2}
            >
              <Heading
                textAlign={"center"}
                p={2}
                fontSize={"lg"}
                bg={"primary.main"}
                color={"#fff"}
                borderTopRadius={8}
                px={2}
              >
                Vitals
              </Heading>
              <Box
                cursor="pointer"
                fontWeight={600}
                fontSize={14}
                p={4}
                boxShadow={"md"}
                bg="#fff"
                borderRadius={5}
                py={2}
                mt={2}
                onClick={() => {
                  if (dateRangePickerRef.current) {
                    // Simulate a click on the DateRangePicker to open the calendar
                    const event = new Event("click", { bubbles: true });
                    dateRangePickerRef.current.dispatchEvent(event);
                  }
                }}
              >
                Date :{" "}
                <DateRangePicker
                  ref={dateRangePickerRef}
                  onChange={(value) => {
                    setRange(value);
                  }}
                  value={Range}
                  format="yyyy-MM-dd"
                  closeCalendar={true}
                  clearIcon={false}
                />
              </Box>
              <Accordion allowToggle mt={5}>
                {vitalsArr.map((member) => (
                  <AccordionItem key={member.name} border="none">
                    {({ isExpanded }) => (
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Card cursor={"pointer"} mb={4}>
                          <AccordionButton
                            p={0}
                            _hover={{ background: "#fff", borderRadius: 8 }}
                          >
                            <CardBody p={4} w="100%">
                              <Flex align={"center"} justify={"space-between"}>
                                <Flex align={"center"} gap={4}>
                                  {member.icon}
                                  <Box>
                                    <Text fontSize={14} fontWeight={600} mb={0}>
                                      {member.name}
                                    </Text>
                                  </Box>
                                </Flex>
                                <Box>
                                  {isExpanded ? (
                                    <AiFillCaretDown
                                      fontSize={18}
                                      color="#3b3b3b"
                                    />
                                  ) : (
                                    <AiFillCaretRight
                                      fontSize={18}
                                      color="#3b3b3b"
                                    />
                                  )}
                                </Box>
                              </Flex>
                            </CardBody>
                          </AccordionButton>

                          <AccordionPanel p={0} pb={4}>
                            <Divider />
                            <Text
                              fontSize={14}
                              px={2}
                              textAlign={"center"}
                              mt={2}
                              fontWeight={500}
                            >
                              {member.description}
                            </Text>
                            {member.box}
                          </AccordionPanel>
                        </Card>
                      </motion.div>
                    )}
                  </AccordionItem>
                ))}
              </Accordion>
            </Box>
          </>
        ) : null}
      </Box>

      <ISDCODEMODAL
        isOpen={isOpen}
        onClose={onClose}
        setisd_code={setIsd_code}
      />
    </Box>
  );
}

export default FamilyMember;
