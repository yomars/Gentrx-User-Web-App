/* eslint-disable react-hooks/rules-of-hooks */
import {
    Box,
    Button,
    Card,
    CardBody,
    Divider,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    Input,
    InputGroup,
    InputLeftAddon,
    Text,
    useColorModeValue,
    useDisclosure,
    useToast,
} from "@chakra-ui/react";
import { ADD, GET } from "../Controllers/ApiControllers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "./Loading";
import { AnimatePresence, motion } from "framer-motion";
import { BsPersonAdd } from "react-icons/bs";
import { FaUser } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { useState } from "react";
import defaultISD from "../Controllers/defaultISD";
import user from "../Controllers/user";
import showToast from "../Controllers/ShowToast";
import ISDCODEMODAL from "./ISDCODEMODAL";

const getData = async () => {
  const res = await GET(`get_patients/user/${user.id}`);
  return res.data;
};

function Patients() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { register, handleSubmit } = useForm();
  const [addNew, setaddNew] = useState(false);
  const [isd_code, setisd_code] = useState(defaultISD);
  const [isUserAddLoading, setisUserAddLoading] = useState(false);
  const toast = useToast();
  const QueryClient = useQueryClient();

  //

  const { isLoading: patientLoading, data: patientData } = useQuery({
    queryKey: ["patients"],
    queryFn: getData,
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
      const res = await ADD(user.token, "add_patient", apiData);
      
      showToast(toast, "success", "Success");
      QueryClient.invalidateQueries("patients");
      setaddNew(false);
    } catch (error) {
      
      setisUserAddLoading(false);
      showToast(toast, "error", "something went wrong");
    }
  };

  return (
    <Box
      w={"full"}
      bg={useColorModeValue("white", "gray.800")}
      boxShadow={"xl"}
      rounded={"lg"}
      mt={5}
      borderRadius={8}
      overflow={"hidden"}
    >
      <Heading
        fontSize={"lg"}
        textAlign={"center"}
        py={3}
        bg={"primary.main"}
        color={"#fff"}
      >
        Patients
      </Heading>
      <Box p={4} mt={2}>
        {" "}
        {addNew ? (
          <Box>
            <Text fontSize={18} fontWeight={600} mb={3} textAlign={"center"}>
              Add New Patient
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
            <Box>
              <AnimatePresence>
                {" "}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {" "}
                  <Button
                    align="center"
                    leftIcon={<BsPersonAdd fontSize={20} />}
                    colorScheme="green"
                    size={"sm"}
                    w={"100%"}
                    onClick={() => {
                      setaddNew(true);
                    }}
                  >
                    Add New Patient
                  </Button>
                  {patientData && (
                    <Box mt={4}>
                      {patientData.map((patient) => (
                        <motion.div
                          key={patient.id}
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.7 }}
                        >
                          <Card cursor={"pointer"} mb={4} onClick={() => {}}>
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
                </motion.div>
              </AnimatePresence>
            </Box>
          </Box>
        )}
      </Box>
      <ISDCODEMODAL
        isOpen={isOpen}
        onClose={onClose}
        setisd_code={setisd_code}
      />
    </Box>
  );
}

export default Patients;
