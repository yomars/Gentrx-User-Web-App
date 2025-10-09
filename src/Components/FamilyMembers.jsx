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
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  Select,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { GET, ADD } from "../Controllers/ApiControllers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "./Loading";
import { AnimatePresence, motion } from "framer-motion";
import { BsPersonAdd } from "react-icons/bs";
import { FaTrash, FaUserFriends } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { useState } from "react";
import user from "../Controllers/user";
import ISDCODEMODAL from "./ISDCODEMODAL";
import defaultISD from "../Controllers/defaultISD";
import showToast from "../Controllers/ShowToast";
import ErrorPage from "../Pages/ErrorPage";
import { useNavigate } from "react-router-dom";

const getData = async () => {
  const res = await GET(`get_family_members/user/${user.id}`);
  return res.data;
};

const handleAdd = async (data) => {
  const res = await ADD(user.token, "add_family_member", data);
  if (res.response !== 200) {
    throw new Error(res.message);
  }
  return res;
};

const handleDelete = async (data) => {
  const res = await ADD(user.token, "delete_family_member", data);
  if (res.response !== 200) {
    throw new Error(res.message);
  }
  return res;
};

function FamilyMembers() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { register, handleSubmit, reset } = useForm();
  const [addNew, setAddNew] = useState(false);
  const [isd_code, setIsdCode] = useState(defaultISD);
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["family-members"],
    queryFn: getData,
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      let formData = {
        ...data,
        isd_code: isd_code,
        user_id: user.id,
      };
      await handleAdd(formData);
    },
    onSuccess: () => {
      showToast(toast, "success", "Family Member Added");
      queryClient.invalidateQueries("family-members");
      reset();
      setAddNew(false);
    },
    onError: (error) => {
      showToast(toast, "error", error.message);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      let formData = {
        id: id,
      };
      await handleDelete(formData);
    },
    onSuccess: () => {
      showToast(toast, "success", "Family Member Deleted");
      queryClient.invalidateQueries("family-members");
    },
    onError: (error) => {
      showToast(toast, "error", error.message);
    },
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;

  return (
    <Box>
      {" "}
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "10" }}>
        <Box className="container">
          <Text
            fontSize={{ base: 18, md: 32 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Family Members
          </Text>
        </Box>
      </Box>
      <Box className="container" maxW={700}>
        <Box
          w={"full"}
          bg={useColorModeValue("white", "gray.800")}
          boxShadow={"xl"}
          rounded={"lg"}
          mt={5}
          borderRadius={8}
          overflow={"hidden"}
        >
          <Divider />
          <Box p={4}>
            {addNew ? (
              <Box>
                <Text
                  fontSize={18}
                  fontWeight={600}
                  mb={3}
                  textAlign={"center"}
                >
                  Add New Family Member
                </Text>
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
                      <FormLabel>Phone</FormLabel>
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
                          type="tel"
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
                    <Button
                      w={"30%"}
                      size={"sm"}
                      onClick={() => setAddNew(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      w={"40%"}
                      size={"sm"}
                      colorScheme="green"
                      type="submit"
                      isLoading={mutation.isPending}
                    >
                      Add
                    </Button>
                  </Flex>
                </Box>
              </Box>
            ) : (
              <Box>
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      align="center"
                      leftIcon={<BsPersonAdd fontSize={20} />}
                      colorScheme="green"
                      size={"sm"}
                      w={"100%"}
                      onClick={() => setAddNew(true)}
                    >
                      Add New Family Member
                    </Button>
                    {data && (
                      <Box mt={5}>
                        {data.map((member) => (
                          <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7 }}
                          >
                            <Card
                              cursor={"pointer"}
                              mb={4}
                              onClick={() => {
                                navigate(`/family-member/${member.id}`);
                              }}
                            >
                              <CardBody p={4}>
                                <Flex
                                  align={"center"}
                                  justify={"space-between"}
                                >
                                  <Flex align={"center"} gap={4}>
                                    {" "}
                                    <FaUserFriends
                                      fontSize={24}
                                      color="#2D3748"
                                    />
                                    <Box>
                                      <Text
                                        fontSize={14}
                                        fontWeight={600}
                                        mb={0}
                                      >
                                        {member.f_name} {member.l_name}
                                      </Text>
                                      <Text fontSize={14} fontWeight={600}>
                                        {member.phone}
                                      </Text>
                                    </Box>
                                  </Flex>

                                  <IconButton
                                    icon={
                                      deleteMutation.isPending ? (
                                        <Spinner />
                                      ) : (
                                        <FaTrash />
                                      )
                                    }
                                    colorScheme={"red"}
                                    size={"sm"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      deleteMutation.mutate(member.id);
                                    }}
                                  />
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
            )}
          </Box>
        </Box>
        <ISDCODEMODAL
          isOpen={isOpen}
          onClose={onClose}
          setisd_code={setIsdCode}
        />
      </Box>
    </Box>
  );
}

export default FamilyMembers;
