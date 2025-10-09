/* eslint-disable react/prop-types */
import {
    Box,
    Text,
    VStack, Flex, Image
} from "@chakra-ui/react";
import Loading from "../Components/Loading";
import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import user from "../Controllers/user";
import {
    FaListAlt,
    FaCheckCircle,
    FaClock,
    FaTimesCircle,
} from "react-icons/fa";
import { useState } from "react";
import { motion } from "framer-motion";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import imageBaseURL from "../Controllers/image";
import currency from "../Controllers/currency";

const steps = [
  {
    Name: "All",
    step: 1,
    icon: <FaListAlt />,
  },
  {
    Name: "Upcoming",
    step: 2,
    icon: <FaClock />,
  },
  {
    Name: "Delivered",
    step: 3,
    icon: <FaCheckCircle />,
  },
  {
    Name: "Cancelled",
    step: 4,
    icon: <FaTimesCircle />,
  },
];

const OrdersCard = ({ order }) => {
  const navigate = useNavigate();

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="md"
      p={{ base: "2", md: "2" }}
      bg="white"
      width="100%"
      mb={3}
      minW={"100%"}
      cursor={"pointer"}
      py={{ base: 4, md: 2 }}
      onClick={() => {
        navigate(`/order/${order.id}`);
      }}
      pos={"relative"}
    >
      <Flex gap={4} align={"start"}>
        <Image
          src={`${imageBaseURL}/${order?.image}`}
          fallbackSrc="/imagePlaceholder.png"
          w={{ base: "80px", md: "80px" }}
          h={{ base: "80px", md: "80px" }}
          bgSize={"cover"}
          borderRadius={5}
        />
        <Box>
          {" "}
          <Text fontSize={"md"} fontWeight={600} m={0}>
            {order?.title}
          </Text>
          <Text fontSize={"xs"} fontWeight={600} m={0} color={"gray.500"}>
            Order id - {order?.id}
          </Text>
          <Text fontSize={"xs"} fontWeight={600} m={0} color={"gray.500"}>
          {order?.qty_text} , Qty : {order.qty}
          </Text>
          <Flex gap={2}>
            <Text fontSize={"md"} fontWeight={600} m={0} color={"primary.text"}>
              {currency} {order?.total_amount}
            </Text>
          </Flex>
          <Flex gap={2} align={"center"}>
            <Text fontSize={"sm"} fontWeight={600} m={0} color={"gray.500"}>
              Order Date : {moment(order.date).format("DD MMMM , YYYY")}
            </Text>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

const Orders = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const getData = async () => {
    const res = await GET(`get_orders_item/user/${user.id}`);
    return res.data;
  };

  const { isLoading, data , error } = useQuery({
    queryKey: ["orders"],
    queryFn: getData,
  });

  const filterData = (orders, filter) => {
    if (filter === 1) return orders;
    return orders.filter((order) => {
      if (filter === 2)
        return (
          order.delivery_status === "Not Delivered" &&
          order.order_status !== "Cancelled"
        );
      if (filter === 3) return order.delivery_status === "Delivered";
      // Assuming status field for 'Cancelled'
      if (filter === 4) return order.order_status === "Cancelled";
      return false;
    });
  };

    if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;

  const filteredData = filterData(data, currentStep);
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
            Orders
          </Text>
        </Box>
      </Box>{" "}
      <div className="container">
        <Flex justify={"center"}>
          <Box maxW={"100vw"} w={"700px"} minH={"80vh"}>
            {" "}
            <Flex gap={5} mt={5} flexDir={{ base: "column", md: "row" }}>
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
                      setCurrentStep(item.step);
                    }}
                    transition={"0.3s ease"}
                    flexDir={{ base: "column", md: "row" }}
                  >
                    <Box
                      p={2}
                      border={"1px solid"}
                      borderColor={
                        currentStep === item.step ? "primary.text" : "gray.200"
                      }
                      borderRadius={4}
                      fontSize={18}
                      color={currentStep === item.step ? "#fff" : "gray.600"}
                      bg={
                        currentStep === item.step
                          ? "primary.text"
                          : "transparent"
                      }
                      transition={"0.3s ease"}
                    >
                      {item.icon}
                    </Box>
                    <Text
                      fontSize={14}
                      fontWeight={currentStep === item.step ? "700" : "600"}
                      color={
                        currentStep === item.step ? "primary.text" : "gray.600"
                      }
                      transition={"0.3s ease"}
                    >
                      {item.Name}
                    </Text>
                  </Flex>
                ))}
              </Box>
              <VStack spacing={1} flex={2}>
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  style={{ minWidth: "100%" }}
                >
                  {filteredData.map((order) => (
                    <OrdersCard key={order.id} order={order} />
                  ))}
                </motion.div>
              </VStack>
            </Flex>
          </Box>
        </Flex>
      </div>
    </Box>
  );
};

export default Orders;


