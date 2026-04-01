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
} from "@chakra-ui/react";
import { GET } from "../Controllers/ApiControllers";
import Loading from "../Components/Loading";
import ErrorPage from "./ErrorPage";
import { AnimatePresence, motion } from "framer-motion";
import user from "../Controllers/user";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import imageBaseURL from "../Controllers/image";
import { SearchIcon } from "@chakra-ui/icons";
import { useState } from "react";
import useDebounce from "../Hooks/UseDebounce";

function openFile(url) {
  const finalURL = `${imageBaseURL}/${url}`;
  window.open(finalURL, "_blank");
}

function Files() {
  const [searchQuery, setsearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);

  const getData = async () => {
    const res = await GET(
      `get_patient_file?user_id=${user.id}&search_query=${debouncedSearchQuery}`
    );
    return res.data;
  };
  const { data, isLoading, error } = useQuery({
    queryKey: ["files", debouncedSearchQuery],
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
            Files
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
                    placeholder="Search Files..."
                    value={searchQuery}
                    onChange={(e) => {
                      let value = e.target.value;
                      setsearchQuery(value);
                    }}
                    variant="outline"
                    focusBorderColor="blue.400"
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
                    The files are currently unavailable. You will be able to
                    access them once the doctor uploads the necessary documents
                  </Text>
                ) : (
                  <Box mt={5}>
                    {data.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                      >
                        <Card mb={4}>
                          <CardBody p={4}>
                            <Flex align={"center"} justify={"space-between"}>
                              <Flex align={"center"} gap={4}>
                                {" "}
                                <GoFileSubmodule
                                  fontSize={24}
                                  color="#2D3748"
                                />
                                <Box>
                                  <Text fontSize={14} fontWeight={600} mb={0}>
                                    {file.file_name}
                                  </Text>
                                  <Text fontSize={12} fontWeight={600}>
                                    {file.f_name} {file.l_name} |{" "}
                                    {moment(file.created_at).format(
                                      "D-MMM-YY HH:MM A"
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
                                  openFile(file.file);
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

export default Files;
