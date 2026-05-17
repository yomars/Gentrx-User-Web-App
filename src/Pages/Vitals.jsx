import { FaUsers } from "react-icons/fa";
import { AiFillCaretRight, AiFillCaretDown } from "react-icons/ai";
import { SiOxygen } from "react-icons/si";
import { MdBloodtype } from "react-icons/md";
import { BiDonateHeart } from "react-icons/bi";
import {
  Box,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  Flex,
  Card,
  CardBody,
  Divider,
  Stack,
} from "@chakra-ui/react";
import { FaThermometer, FaWeight } from "react-icons/fa";
import { useTheme } from "@emotion/react";
import { motion } from "framer-motion";
import BloodPressure from "./Vitals/BloodPressure";
import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import user from "../Controllers/user";
import Loading from "../Components/Loading";
import { useEffect, useMemo, useRef, useState } from "react";
import DateRangePicker from "@wojtekmaj/react-daterange-picker";
import "@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css";
import "react-calendar/dist/Calendar.css";
import moment from "moment";
import BloodSugar from "./Vitals/BloodSugar";
import Weight from "./Vitals/Weigjht";
import Temperature from "./Vitals/Temp";
import SpO2 from "./Vitals/Spo2";
import logoutFn from "../Controllers/logout";

const getLast7DaysRange = () => {
  const endDate = moment().startOf("day");
  const startDate = moment().subtract(7, "days").startOf("day");
  return [startDate.toDate(), endDate.toDate()];
};

const getFamilyMemberData = async () => {
  if (!user?.id) {
    throw new Error("Missing user id.");
  }
  const res = await GET(`get_family_members/user/${user.id}`);
  return res.data;
};

function Vitals() {
  const selfMember = useMemo(
    () => ({
      id: user?.id,
      f_name: user?.f_name || "My",
      l_name: user?.l_name || "Self",
      isSelf: true,
    }),
    [user?.id, user?.f_name, user?.l_name]
  );
  const [selectedMember, setSelectedMember] = useState(selfMember);
  const [isOpen, setIsOpen] = useState(false);
  const [Range, setRange] = useState(getLast7DaysRange());
  const dateRangePickerRef = useRef(null);

  const startDate = moment(Range[0]).format("YYYY-MM-DD");
  const endData = moment(Range[1]).format("YYYY-MM-DD");

  const handleSelection = (member) => {
    setSelectedMember(member);
    setIsOpen(false); // Close the dropdown after selection
  };
  const theme = useTheme();
  const { data: familyMembers, isLoading: familyLoading } = useQuery({
    queryKey: ["family-members"],
    queryFn: getFamilyMemberData,
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id || !user?.token) {
      logoutFn();
    }
  }, []);

  useEffect(() => {
    // Keep a safe default so vitals can be added for the patient even
    // when there are no family members.
    if (!selectedMember?.id) {
      setSelectedMember(selfMember);
    }
  }, [selectedMember, selfMember]);

  const vitalsArr = [
    {
      name: "Blood-Pressure",
      icon: <BiDonateHeart fontSize={20} color={theme.colors.green[600]} />,
      description: "Blood Pressure details and history",
      box: (
        <BloodPressure
          selectedMember={selectedMember}
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
          selectedMember={selectedMember}
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
        <Weight
          selectedMember={selectedMember}
          startDate={startDate}
          endDate={endData}
        />
      ),
    },
    {
      name: "Temperature",
      icon: <FaThermometer fontSize={20} color={theme.colors.green[600]} />,
      description: "Body temperature monitoring.",
      box: (
        <Temperature
          selectedMember={selectedMember}
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
        <SpO2
          selectedMember={selectedMember}
          startDate={startDate}
          endDate={endData}
        />
      ),
    },
  ];

  if (familyLoading) return <Loading />;
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
            Vitals
          </Text>
        </Box>
      </Box>
      <Box className="container" maxW={600} mt={5}>
        <Box w={"full"} mt={2} borderRadius={8}>
          <Box
            cursor="pointer"
            fontWeight={600}
            fontSize={14}
            onClick={() => setIsOpen(!isOpen)}
            p={4}
            boxShadow={"md"}
            bg="primary.bg"
            borderRadius={5}
            py={3}
            color={"#fff"}
          >
            <Flex align={"center"} justify={"space-between"}>
              <Flex align={"center"} justify={"space-between"} gap={2}>
                {" "}
                <FaUsers />
                {selectedMember ? (
                  <Text>
                    {selectedMember.isSelf
                      ? "Tracking: Myself"
                      : `Family Member : ${selectedMember.f_name} ${selectedMember.l_name}`}
                  </Text>
                ) : (
                  <Text>Select Family Member</Text>
                )}{" "}
              </Flex>{" "}
              {isOpen ? (
                <AiFillCaretDown fontSize={18} color="#fff" />
              ) : (
                <AiFillCaretRight fontSize={18} color="#fff" />
              )}
            </Flex>
          </Box>

          {isOpen && (
            <Box mt={2} borderRadius="md" boxShadow="sm">
              <Stack spacing={2}>
                <Box
                  p={2}
                  bg="#fff"
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: "primary.bg", color: "#fff" }}
                  onClick={() => handleSelection(selfMember)}
                  fontWeight={600}
                  display={"flex"}
                  alignItems={"center"}
                  gap={3}
                >
                  <FaUsers /> Myself
                </Box>
                {!familyMembers || !familyMembers.length ? (
                  <Box
                    p={2}
                    bg="#fff"
                    borderRadius="md"
                    cursor="default"
                    fontWeight={600}
                    display={"flex"}
                    alignItems={"center"}
                    gap={3}
                  >
                    No family members yet. You can still track your own vitals.
                  </Box>
                ) : (
                  familyMembers.map((item) => (
                    <Box
                      key={item.id}
                      p={2}
                      bg="#fff"
                      borderRadius="md"
                      cursor="pointer"
                      _hover={{ bg: "primary.bg", color: "#fff" }}
                      onClick={() => handleSelection(item)}
                      fontWeight={600}
                      display={"flex"}
                      alignItems={"center"}
                      gap={3}
                    >
                      <FaUsers /> {item.f_name} {item.l_name}
                    </Box>
                  ))
                )}
              </Stack>
            </Box>
          )}

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
      </Box>
    </Box>
  );
}

export default Vitals;
