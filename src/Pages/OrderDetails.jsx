/* eslint-disable react/prop-types */
import { AiOutlineRight } from "react-icons/ai";
import { AiOutlineDownload } from "react-icons/ai";
import {
  Box,
  Flex,
  Text,
  Badge,
  Button,
  Divider,
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
} from "@chakra-ui/react";
import moment from "moment";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import Loading from "../Components/Loading";
import { GET } from "../Controllers/ApiControllers";
import imageBaseURL from "../Controllers/image";
import { useRef } from "react";
import showToast from "../Controllers/ShowToast";
import currency from "../Controllers/currency";
import { BsFillTelephoneFill } from "react-icons/bs";
import ErrorPage from "./ErrorPage";

const getColorScheme = (status) => {
  switch (status) {
    case "Pending":
      return "yellow";
    case "Confirmed":
      return "green";
    case "Cancelled":
      return "red";
    default:
      return "gray";
  }
};

const formatAddress = (address) => {
  const { name, flat_no, apartment_name, area, landmark, city, pincode } =
    address;
  let addressString = `${name}, \n`;

  if (flat_no) {
    addressString += `${flat_no}, `;
  }

  if (apartment_name) {
    addressString += `${apartment_name}, `;
  }

  addressString += `${area}, ${landmark}, ${city} - ${pincode}`;
  return addressString;
};

const OrderDetails = () => {
  const { id } = useParams();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();
  const getData = async () => {
    const res = await GET(`get_orders_item/${id}`);
    return res.data;
  };
  const {
    isLoading,
    data: orderData,
    error,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: getData,
  });

  // req history

  if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;
  return (
    <Box>
      {" "}
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
            Order #{id}
          </Text>
        </Box>
      </Box>{" "}
      <Box className="container" minH={"50vh"}>
        <Flex justify={"center"}>
          {" "}
          <Box
            p={[2, 4, 5]}
            shadow="lg"
            borderWidth="1px"
            borderRadius="lg"
            mx="auto"
            bg="white"
            mt={5}
            w={600}
            maxW={"100vw"}
          >
            <Flex gap={4} align={"start"}>
              <Image
                src={`${imageBaseURL}/${orderData?.image}`}
                fallbackSrc="/imagePlaceholder.png"
                w={{ base: "80px", md: "80px" }}
                h={{ base: "80px", md: "80px" }}
                bgSize={"cover"}
                borderRadius={5}
              />
              <Box>
                {" "}
                <Text fontSize={"md"} fontWeight={600} m={0}>
                  {orderData?.title}
                </Text>
                <Text fontSize={"xs"} fontWeight={600} m={0} color={"gray.500"}>
                  {orderData?.qty_text} , Qty : {orderData.qty}
                </Text>
                <Flex gap={2}>
                  <Text
                    fontSize={"md"}
                    fontWeight={600}
                    m={0}
                    color={"primary.text"}
                  >
                    {currency} {orderData?.total_amount}
                  </Text>
                </Flex>
                <Flex gap={2} align={"center"}>
                  <Text
                    fontSize={"sm"}
                    fontWeight={600}
                    m={0}
                    color={"gray.500"}
                  >
                    Order Date :{" "}
                    {moment(orderData.date).format("DD MMMM , YYYY")}
                  </Text>
                </Flex>
              </Box>
            </Flex>
            <Divider my={2} />
            <Flex align={"center"} justify={"space-between"}>
              {" "}
              <Text fontWeight="bold" color={"gray.600"}>
                Order #{orderData.id}
              </Text>
              <Badge
                colorScheme={getColorScheme(orderData.order_status)}
                variant="solid"
                mt={1}
              >
                {orderData.order_status}
              </Badge>
            </Flex>

            <Divider my={2} />
            <Box
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              p={{ base: "2", md: "2" }}
              bg="white"
              width="100%"
              mb={3}
              minW={"100%"}
              cursor={"pointer"}
              py={{ base: 2, md: 2 }}
            >
              <Text fontSize={"md"} fontWeight={600} m={0} color={"gray.800"}>
                Delivery Address
              </Text>
              <Flex
                fontWeight={600}
                align={"center"}
                gap={2}
                color={"gray.600"}
                fontSize={"sm"}
              >
                {" "}
                <BsFillTelephoneFill fontSize={14} />
                <Text> {orderData.s_phone}</Text>
              </Flex>
              <Text fontWeight={600} color={"gray.600"} fontSize={"sm"}>
                {formatAddress(orderData)}
              </Text>
            </Box>

            <Divider my={2} mt={5} />

            <Box mt={5}>
              <Flex align={"center"} justify={"space-between"}>
                {" "}
                <Text fontWeight="bold">Payment Status</Text>
                <Badge
                  colorScheme={
                    orderData.payment_type === "Paid" ? "green" : "red"
                  }
                  fontWeight="bold"
                  variant="solid"
                >
                  {orderData.payment_type}
                </Badge>
              </Flex>

              <Text color={"gray.600"} fontSize={"sm"} fontWeight={600}>
                Payment Id #{orderData.id}
              </Text>
              <Button
                variant="link"
                colorScheme="green"
                rightIcon={<AiOutlineDownload fontSize={18} />}
              >
                Download Invoice
              </Button>
            </Box>

            <Divider my={3} />
            <Box>
              <Box
                bg={"red.400"}
                _hover={{
                  bg: "red.500",
                }}
                mt={0}
                width="100%"
                size={"sm"}
                as={Button}
                color={"#000"}
                rightIcon={<AiOutlineRight color="#fff" />}
                justifyContent={"space-between"}
                alignItems={"center"}
                textAlign={"left"}
                py={2}
                h={"fit-content"}
                onClick={() => {
                  if (orderData.current_cancel_req_status === "Approved") {
                    return;
                  }
                  onOpen();
                }}
              >
                <Box>
                  <Text fontSize={"md"} color={"#fff"}>
                    Cancel Order
                  </Text>
                  {orderData.current_cancel_req_status !== "Approved" && (
                    <Text fontSize={"xs"} mt={1} color={"gray.100"}>
                      Click here to cancel the order
                    </Text>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Flex>
      </Box>
      {/* modal */}
      <DailogModal
        cancelRef={cancelRef}
        isOpen={isOpen}
        onClose={onClose}
        currentStatus={orderData.current_cancel_req_status}
        appointID={id}
      />
    </Box>
  );
};

export default OrderDetails;

const DailogModal = ({ cancelRef, isOpen, onClose }) => {
  const toast = useToast();

  // initate cancel
  const handleCancellation = async () => {
    onClose();
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      await handleCancellation(data);
    },
    onSuccess: () => {
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
        <AlertDialogHeader fontSize={"md"}>Cancel Order</AlertDialogHeader>
        <AlertDialogCloseButton />
        <AlertDialogBody>
          Are you sure , you want to cancel this Order ?
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
              mutation.mutate({});
            }}
          >
            Yes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
