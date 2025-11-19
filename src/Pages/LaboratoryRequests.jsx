import { FaFileDownload } from "react-icons/fa";
import { GoFileSubmodule } from "react-icons/go";
import {
  Box,
  Card,
  CardBody,
  Flex,
  IconButton,
  Text,
  InputGroup,
  InputLeftElement,
  Input,
  Badge,
} from "@chakra-ui/react";
import { GET } from "../Controllers/ApiControllers";
import Loading from "../Components/Loading";
import ErrorPage from "./ErrorPage";
import { AnimatePresence, motion } from "framer-motion";
import user from "../Controllers/user";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { SearchIcon } from "@chakra-ui/icons";
import { useState } from "react";
import useDebounce from "../Hooks/UseDebounce";
import api from "../Controllers/api";

function openFile(url) {
  window.open(url, "_blank");
}

function LaboratoryRequests() {
  const [searchQuery, setsearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);

  const getData = async () => {
    const res = await GET(
      `get_laboratory_requests?user_id=${user.id}&search=${debouncedSearchQuery}`
    );
    return res.data;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["laboratory-requests", debouncedSearchQuery],
    queryFn: getData,
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;

  return (
    <Box minH={"50vh"}>
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "10" }}>
        <Box className="container">
          <Text
            fontSize={{ base: 18, md: 32 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Laboratory Requests
          </Text>
        </Box>
      </Box>
      <Box className="container" maxW={600}>
        <Box
          w={"full"}
          rounded={"lg"}
          mt={5}
          borderRadius={8}
          overflow={"hidden"}
          p={2}
        >
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Box w="100%" mx="auto" mb={5}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.300" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search Laboratory Requests..."
                    value={searchQuery}
                    onChange={(e) => {
                      let value = e.target.value;
                      setsearchQuery(value);
                    }}
                    variant="outline"
                    focusBorderColor="green.400"
                    bg={"#fff"}
                  />
                </InputGroup>
              </Box>
              {data &&
                (!data.length ? (
                  <Text
                    fontSize={14}
                    fontWeight={600}
                    mb={0}
                    textAlign={"center"}
                  >
                    No laboratory requests found. Laboratory requests will appear
                    here once your doctor creates them.
                  </Text>
                ) : (
                  <Box mt={5}>
                    {data.map((request) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                      >
                        <Card cursor={"pointer"} mb={4}>
                          <CardBody p={4}>
                            <Flex align={"center"} justify={"space-between"}>
                              <Flex align={"center"} gap={4}>
                                <GoFileSubmodule
                                  fontSize={24}
                                  color="#2D3748"
                                />
                                <Box>
                                  <Text fontSize={14} fontWeight={600} mb={0}>
                                    {request.patient_f_name}{" "}
                                    {request.patient_l_name} #{request.id}
                                  </Text>
                                  <Text fontSize={13} fontWeight={500} mb={0}>
                                    Dr. {request.doctor_f_name}{" "}
                                    {request.doctor_l_name}
                                  </Text>
                                  {request.clinical_indication && (
                                    <Text
                                      fontSize={12}
                                      fontWeight={500}
                                      color={"gray.600"}
                                      noOfLines={1}
                                    >
                                      {request.clinical_indication}
                                    </Text>
                                  )}
                                  <Flex gap={2} mt={1} flexWrap={"wrap"}>
                                    {request.items?.slice(0, 3).map((item) => (
                                      <Badge
                                        key={item.id}
                                        colorScheme={
                                          item.is_urgent ? "red" : "green"
                                        }
                                        fontSize={"10px"}
                                      >
                                        {item.test_name}
                                      </Badge>
                                    ))}
                                    {request.items?.length > 3 && (
                                      <Badge
                                        colorScheme="gray"
                                        fontSize={"10px"}
                                      >
                                        +{request.items.length - 3} more
                                      </Badge>
                                    )}
                                  </Flex>
                                  <Text fontSize={12} fontWeight={600}>
                                    {moment(request.created_at).format(
                                      "D-MMM-YY HH:mm A"
                                    )}
                                  </Text>
                                </Box>
                              </Flex>
                              <IconButton
                                icon={<FaFileDownload />}
                                colorScheme={"green"}
                                size={"sm"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openFile(
                                    `${api}/laboratory_request/generatePDF/${request.id}`
                                  );
                                }}
                              />
                            </Flex>
                          </CardBody>
                        </Card>
                      </motion.div>
                    ))}
                  </Box>
                ))}
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
}

export default LaboratoryRequests;