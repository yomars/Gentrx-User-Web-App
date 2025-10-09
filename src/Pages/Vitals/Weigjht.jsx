import { BiTrash } from "react-icons/bi";
import { AiFillEdit } from "react-icons/ai";
/* eslint-disable react/prop-types */
import {
  Box,
  Flex,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Divider,
  Button,
  IconButton,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  useDisclosure,
  Input,
  FormControl,
  FormLabel,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTheme } from "@emotion/react";
import moment from "moment";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "../../Components/Loading";
import { ADD, GET } from "../../Controllers/ApiControllers";
import { useForm } from "react-hook-form";
import user from "../../Controllers/user";
import showToast from "../../Controllers/ShowToast";
import { useState } from "react";

const addData = async (data) => {
  const res = await ADD(user.token, "add_vitals", data);
  if (res.response !== 200) {
    throw new Error(res.message);
  }
  return res;
};
const handleDelete = async (data) => {
  const res = await ADD(user.token, "delete_vitals", data);
  if (res.response !== 200) {
    throw new Error(res.message);
  }
  return res;
};
const handleUpdate = async (data) => {
  const res = await ADD(user.token, "update_vitals", data);
  if (res.response !== 200) {
    throw new Error(res.message);
  }
  return res;
};

function Weight({ selectedMember, startDate, endDate }) {
  const [selectedData, setselectedData] = useState();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: deleteisOpen,
    onOpen: deleteonOpen,
    onClose: deleteonClose,
  } = useDisclosure();
  const {
    isOpen: editisOpen,
    onOpen: editonOpen,
    onClose: editonClose,
  } = useDisclosure();
  const theme = useTheme();
  const getData = async () => {
    const res = await GET(
      `get_vitals_family_member_id_type?family_member_id=${selectedMember.id}&type=Weight&start_date=${startDate}&end_date=${endDate}`
    );

    return res.data;
  };
  const { data, isLoading } = useQuery({
    queryKey: ["vitals-weight", selectedMember, startDate, endDate],
    queryFn: getData,
    enabled: !!selectedMember,
  });

  const chartData = data?.map((item) => ({
    dateTime: `${item.date} ${item.time}`,
    weight: item.weight,
  }));

  const systolicGradientId = "colorRandom";
  const diastolicGradientId = "colorFasting";

  const strokecolorRandom = useColorModeValue(
    theme.colors.green[500],
    theme.colors.green[200]
  );
  const strokecolorFasting = useColorModeValue(
    theme.colors.red[500],
    theme.colors.red[200]
  );

  if (isLoading) return <Loading />;

  return (
    <Box bg={"#FFF"}>
      <Box>
        {data && data.length ? (
          <Box flex={1} w={"100%"} ml={-9} mt={5} pr={1}>
            <ResponsiveContainer width="106%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id={systolicGradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={strokecolorRandom}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="110%"
                      stopColor={strokecolorRandom}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient
                    id={diastolicGradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={strokecolorFasting}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor={strokecolorFasting}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="none" />
                <XAxis
                  dataKey="dateTime"
                  tick={false} // Hide X-axis ticks
                  axisLine={true} // Hide X-axis line
                />
                <YAxis
                  tick={true} // Hide Y-axis ticks
                  axisLine={true} // Hide Y-axis line
                  fontSize={10}
                />
                <Tooltip />
                <Area
                  cursor={"pointer"}
                  type="monotone"
                  dataKey="weight"
                  stroke={strokecolorRandom}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#${systolicGradientId})`}
                  name="Random Sugar"
                  // Hide legend label
                  activeDot={{
                    stroke: strokecolorRandom,
                    strokeWidth: 3,
                    r: 1,
                  }}
                  dot={{ stroke: strokecolorRandom, strokeWidth: 2, r: 1 }} // Show points
                  connectNulls={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        ) : null}
        <Divider />
        <Box p={1} mt={2}>
          <Flex justify={"space-between"} alignItems={"center"}>
            <Text fontSize={["sm", "sm"]} fontWeight="bold">
              Weight History -
            </Text>
            <Button
              size={"sm"}
              fontSize={["xs", "sm"]}
              colorScheme={"green"}
              onClick={onOpen}
            >
              Add Data
            </Button>
          </Flex>
          {!data?.length ? (
            <Alert status="error" py={1} fontWeight={600} mt={3} fontSize={14}>
              <AlertIcon />
              No Data Found from{" "}
              {moment(startDate, "YYYY-MM-DD").format("DD MMM YY")} to{" "}
              {moment(endDate, "YYYY-MM-DD").format("DD MMM YY")}
            </Alert>
          ) : (
            <TableContainer mt={4}>
              <Table colorScheme="green">
                <Thead>
                  <Tr bg={"green.500"}>
                    <Th px={1} py={2} color={"#fff"}>
                      Weight (KG)
                    </Th>
                    <Th px={1} py={2} color={"#fff"}>
                      Date
                    </Th>
                    <Th px={1} py={2} color={"#fff"}>
                      Time
                    </Th>
                    <Th px={1} py={2} color={"#fff"}>
                      Action
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data?.map((record) => (
                    <Tr key={record.id} fontSize={14}>
                      <Td px={1} py={2}>
                        {record?.weight || 0} (KG)
                      </Td>
                      <Td px={1} py={2}>
                        {" "}
                        {record.date}
                      </Td>
                      <Td px={1} py={2}>
                        {moment(record.time, "HH:mm:ss").format("hh:mm A")}
                      </Td>
                      <Td px={1} py={2}>
                        <Flex gap={1}>
                          <IconButton
                            colorScheme={"green"}
                            size={"xs"}
                            variant={"ghost"}
                            icon={<AiFillEdit fontSize={18} />}
                            onClick={() => {
                              setselectedData(record);
                              editonOpen();
                            }}
                          />
                          <IconButton
                            colorScheme={"red"}
                            size={"xs"}
                            variant={"ghost"}
                            icon={<BiTrash fontSize={18} />}
                            onClick={() => {
                              setselectedData(record);
                              deleteonOpen();
                            }}
                          />
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>
      {isOpen ? (
        <AddNew
          isOpen={isOpen}
          onClose={onClose}
          selectedMember={selectedMember}
        />
      ) : null}
      {deleteisOpen ? (
        <DeleteData
          isOpen={deleteisOpen}
          onClose={deleteonClose}
          selectedMember={selectedMember}
          data={selectedData}
        />
      ) : null}
      {editisOpen ? (
        <Edit
          isOpen={editisOpen}
          onClose={editonClose}
          selectedMember={selectedMember}
          data={selectedData}
        />
      ) : null}
    </Box>
  );
}

export default Weight;

const AddNew = ({ onClose, isOpen, selectedMember }) => {
  const now = new Date();
  const { register, handleSubmit, reset } = useForm();
  const queryClient = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: async (data) => {
      await addData(data);
    },
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries(["vitals", selectedMember]);
      showToast(toast, "success", "Success");
      onClose();
    },
    onError: (error) => {
      showToast(toast, "error", error.message);
      onClose();
    },
  });

  const onSubmit = (data) => {
    let formData = {
      ...data,
      user_id: user.id,
      family_member_id: selectedMember.id,
      type: "Weight",
    };
    mutation.mutate(formData);
    // Reset the form after submission
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent
        overflow={"hidden"}
        as={"form"}
        onSubmit={handleSubmit(onSubmit)}
      >
        <ModalHeader
          fontSize={"md"}
          py={2}
          textAlign={"center"}
          bg={"primary.bg"}
          color={"#fff"}
        >
          Add Weight Data
        </ModalHeader>

        <Divider />
        <ModalBody px={2}>
          <Flex gap={2}>
            <FormControl mb={4}>
              <FormLabel mb={1}>Date</FormLabel>
              <Input
                type="date"
                defaultValue={moment(now).format("YYYY-MM-DD")}
                {...register("date", { required: true })}
              />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel mb={1}>Time</FormLabel>
              <Input
                type="time"
                defaultValue={moment(now).format("HH:mm")}
                textAlign={"left"}
                {...register("time", { required: true })}
              />
            </FormControl>
          </Flex>

          <FormControl mb={4}>
            <FormLabel mb={1}>Weight (KG)</FormLabel>
            <Input
              type="number"
              placeholder="Enter Weight (KG)"
              {...register("weight", { required: true })}
            />
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" mr={3} onClick={onClose} size={"sm"}>
            Cancel
          </Button>
          <Button
            colorScheme="green"
            size={"sm"}
            w={32}
            isLoading={mutation.isPending}
            type="submit"
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const Edit = ({ onClose, isOpen, selectedMember, data }) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      date: data?.date,
      time: data?.time,
      weight: data?.weight,
    },
  });
  const queryClient = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: async (data) => {
      await handleUpdate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["vitals", selectedMember]);
      showToast(toast, "success", "Data updated successfully!");
      onClose();
      reset();
    },
    onError: (error) => {
      showToast(toast, "error", error.message);
      onClose();
    },
  });

  const onSubmit = (dataFromInput) => {
    const formData = {
      ...dataFromInput,
      id: data.id,
      user_id: user.id,
      family_member_id: selectedMember.id,
      type: "Weight",
    };
    mutation.mutate(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent
        overflow="hidden"
        as="form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <ModalHeader
          fontSize="md"
          py={2}
          textAlign="center"
          bg="primary.bg"
          color="#fff"
        >
          Update Weight Data
        </ModalHeader>

        <Divider />
        <ModalBody px={2}>
          <Flex gap={2}>
            <FormControl mb={4}>
              <FormLabel mb={1}>Date</FormLabel>
              <Input
                type="date"
                {...register("date", { required: true })}
                isDisabled
                _disabled={{ color: "#000" }}
              />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel mb={1}>Time</FormLabel>
              <Input
                type="time"
                {...register("time", { required: true })}
                isDisabled
                _disabled={{ color: "#000" }}
              />
            </FormControl>
          </Flex>

          <FormControl mb={4}>
            <FormLabel mb={1}>Weight (KG)</FormLabel>
            <Input
              type="number"
              {...register("weight", { required: true })}
              placeholder="Enter Weight (KG)"
            />
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" mr={3} onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button
            colorScheme="green"
            size="sm"
            w={32}
            isLoading={mutation.isPending}
            type="submit"
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const DeleteData = ({ onClose, isOpen, selectedMember, data }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      let formData = {
        id: data.id,
      };
      await handleDelete(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["vitals", selectedMember]);
      showToast(toast, "success", "Success");
      onClose();
    },
    onError: (error) => {
      showToast(toast, "error", error.message);
      onClose();
    },
  });

  return (
    <AlertDialog isOpen={isOpen} onClose={onClose} isCentered>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Vitals Data
          </AlertDialogHeader>

          <AlertDialogBody fontSize={"md"} fontWeight={500}>
            Are you sure? Do you want to delete Weight data for date -{" "}
            {data?.date}
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button onClick={onClose} size={"sm"}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={mutation.mutate}
              ml={3}
              size={"sm"}
              w={32}
              isLoading={mutation.isPending}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
