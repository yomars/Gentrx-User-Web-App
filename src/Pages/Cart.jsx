import { IoMdWallet } from "react-icons/io";
/* eslint-disable react/prop-types */
import useCartData from "../Hooks/CartData";
import {
  Box,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  Divider,
  Image,
  Button,
  useToast,
  Checkbox,
  RadioGroup,
  Stack,
  Radio,
} from "@chakra-ui/react";
import Loading from "../Components/Loading";
import imageBaseURL from "../Controllers/image";
import currency from "../Controllers/currency";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, lazy, Suspense } from "react";
import { ADD } from "../Controllers/ApiControllers";
import user from "../Controllers/user";
import showToast from "../Controllers/ShowToast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
const Address = lazy(() => import("../Components/Address"));
import { BsFillTelephoneFill } from "react-icons/bs";

const removeFromCart = async (id, toast, queryClient) => {
  try {
    const res = await ADD(user.token, "cart/delete", {
      id,
    });
    if (res.response === 200) {
      showToast(toast, "success", "Item Removed!");
      queryClient.invalidateQueries("cartdata");
      return res;
    } else {
      showToast(toast, "error", res.message);
    }
  } catch (error) {
    return error;
  }
};

const calculateTotalPrice = (items) => {
  return items.reduce((sum, item) => sum + item.total_price, 0);
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

export default function Cart() {
  const [step, setstep] = useState(1);
  const [address, setAddress] = useState();
  const { cartData, cartLoading } = useCartData();
  const [Selected, setSelected] = useState();

  // scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const labTestInCart = cartData?.filter(
    (cart) => cart.product_id === null && cart.lab_test_id != null
  );

  const productsInCart = cartData?.filter(
    (cart) => cart.product_id != null && cart.lab_test_id === null
  );
  

  if (cartLoading) return <Loading />;

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
            {step === 1
              ? "Cart"
              : step === 2
              ? "Select Address"
              : step === 3
              ? "Payment"
              : ""}
          </Text>
        </Box>
      </Box>
      {step === 1 ? (
        <Box className="container" mt={0} minH={"50vh"}>
          <Flex gap={5} mt={2} align={"center"} justify={"center"}>
            <Box
              w={"900px"}
              maxW={"100vw"}
              border={"1px solid"}
              borderColor={"gray.200"}
              p={0}
              borderRadius={4}
              h={"fit-content"}
              bg={"#fff"}
            >
              <Tabs isFitted>
                <TabList mb="1em">
                  <Tab fontWeight={600}>Products</Tab>
                  <Tab fontWeight={600}>Lab Tests</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel p={2}>
                    {!productsInCart?.length ? (
                      <Text
                        color={"gray.600"}
                        fontSize={"sm"}
                        fontWeight={600}
                        textAlign={"center"}
                      >
                        Your product cart section is empty! Explore our range of
                        products and find the care you need.
                      </Text>
                    ) : (
                      <>
                        {" "}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{ minWidth: "100%" }}
                        >
                          {productsInCart?.map((item) => (
                            <ProductCards
                              data={item}
                              key={item.id}
                              setSelected={setSelected}
                              Selected={Selected}
                            />
                          ))}
                        </motion.div>
                        <Flex align={"center"} justify={"space-between"}>
                          <Text
                            fontWeight={600}
                            color={"primary.text"}
                            fontSize={"lg"}
                          >
                            Total : {currency}
                            {calculateTotalPrice(productsInCart)}
                          </Text>{" "}
                          <Button
                            size={"sm"}
                            w={"50%"}
                            colorScheme={"green"}
                            onClick={() => {
                              setstep(2);
                            }}
                          >
                            Place Order
                          </Button>
                        </Flex>
                      </>
                    )}
                  </TabPanel>
                  <TabPanel p={2}>
                    {!labTestInCart?.length ? (
                      <Text
                        color={"gray.600"}
                        fontSize={"sm"}
                        fontWeight={600}
                        textAlign={"center"}
                      >
                        Your lab tests cart section is empty! Explore our range
                        of services and find the care you need.
                      </Text>
                    ) : (
                      <>
                        {" "}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{ minWidth: "100%" }}
                        >
                          {labTestInCart?.map((item) => (
                            <LabCards
                              lab={item}
                              key={item.id}
                              setSelected={setSelected}
                              Selected={Selected}
                            />
                          ))}
                        </motion.div>
                      </>
                    )}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          </Flex>
        </Box>
      ) : step === 2 ? (
        <Suspense fallback={null}>
          <Address setAddress={setAddress} setStep={setstep} />
        </Suspense>
      ) : step === 3 ? (
        <Checkout items={productsInCart} address={address} setStep={setstep} />
      ) : null}
    </Box>
  );
}

const LabCards = ({ lab, Selected, setSelected }) => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data) => {
      await removeFromCart(data, toast, queryClient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries("cartdata");
    },
    onError: (error) => {
      showToast(toast, "error", JSON.stringify(error));
    },
  });

  if (mutation.isPending) return <Loading />;
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      p={{ base: "2", md: "2" }}
      bg="white"
      width="100%"
      mb={6}
      minW={"100%"}
      cursor={"pointer"}
      py={{ base: 4, md: 2 }}
      onClick={() => {
        setSelected(Selected?.id === lab.id ? null : lab);
      }}
    >
      <Flex gap={4} align={"start"}>
        <Image
          src={`${imageBaseURL}/${lab.lab_test_image}`}
          fallbackSrc="/imagePlaceholder.png"
          w={{ base: "80px", md: "80px" }}
          h={{ base: "80px", md: "80px" }}
          bgSize={"cover"}
          borderRadius={5}
        />
        <Box>
          {" "}
          <Text fontSize={"md"} fontWeight={600} m={0}>
            {lab?.lab_test_title}
          </Text>
          <Text fontSize={"sm"} fontWeight={600} m={0}>
            {lab?.lab_test_sub_title}
          </Text>
          <Flex gap={2}>
            {" "}
            <Text fontSize={"sm"} fontWeight={600} m={0} color={"primary.text"}>
              {currency} {lab?.total_price}
            </Text>
          </Flex>
          <Flex gap={2} align={"center"} mt={2}>
            <Text fontSize={"sm"} fontWeight={600} m={0} color={"gray.500"}>
              Qty : {lab?.qty}
            </Text>
            <Box h={5}>
              {" "}
              <Divider orientation="vertical" />
            </Box>
            <Button
              colorScheme={"red"}
              size={"xs"}
              variant={"ghost"}
              fontSize={"xs"}
              backgroundColor={"red.50"}
              fontWeight={700}
              onClick={(e) => {
                e.stopPropagation();
                mutation.mutate(lab.id);
              }}
            >
              Remove
            </Button>
          </Flex>
          <AnimatePresence>
            {Selected?.id === lab.id ||
              (Selected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Box>
                    <Divider my={3} />
                    <Flex gap={2} justify={"space-between"} align={"center"}>
                      {" "}
                      <Text
                        fontSize={"sm"}
                        fontWeight={600}
                        m={0}
                        color={"gray.500"}
                      >
                        MRP
                      </Text>
                      <Text
                        fontSize={"sm"}
                        fontWeight={600}
                        m={0}
                        color={"primary.text"}
                      >
                        {currency} {lab?.mrp}
                      </Text>
                    </Flex>
                    <Flex gap={2} justify={"space-between"} align={"center"}>
                      {" "}
                      <Text
                        fontSize={"sm"}
                        fontWeight={600}
                        m={0}
                        color={"gray.500"}
                      >
                        PRICE
                      </Text>
                      <Text
                        fontSize={"sm"}
                        fontWeight={600}
                        m={0}
                        color={"primary.text"}
                      >
                        {currency} {lab?.price}
                      </Text>
                    </Flex>
                    <Flex gap={2} justify={"space-between"} align={"center"}>
                      {" "}
                      <Text
                        fontSize={"sm"}
                        fontWeight={600}
                        m={0}
                        color={"gray.500"}
                      >
                        TAX
                      </Text>
                      <Text
                        fontSize={"sm"}
                        fontWeight={600}
                        m={0}
                        color={"primary.text"}
                      >
                        {lab?.tax} %
                      </Text>
                    </Flex>
                    <Flex gap={2} justify={"space-between"} align={"center"}>
                      {" "}
                      <Text
                        fontSize={"sm"}
                        fontWeight={600}
                        m={0}
                        color={"gray.500"}
                      >
                        QTY
                      </Text>
                      <Text
                        fontSize={"sm"}
                        fontWeight={600}
                        m={0}
                        color={"primary.text"}
                      >
                        {lab?.qty}
                      </Text>
                    </Flex>
                    <Divider my={1} />
                    <Flex gap={2} justify={"space-between"} align={"center"}>
                      {" "}
                      <Text
                        fontSize={"sm"}
                        fontWeight={600}
                        m={0}
                        color={"gray.500"}
                      >
                        Total
                      </Text>
                      <Text
                        fontSize={"sm"}
                        fontWeight={600}
                        m={0}
                        color={"primary.text"}
                      >
                        {currency} {lab?.total_price}
                      </Text>
                    </Flex>
                  </Box>
                </motion.div>
              ))}
          </AnimatePresence>
        </Box>
      </Flex>
    </Box>
  );
};
const ProductCards = ({ data, Selected, setSelected }) => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data) => {
      await removeFromCart(data, toast, queryClient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries("cartdata");
    },
    onError: (error) => {
      showToast(toast, "error", JSON.stringify(error));
    },
  });

  if (mutation.isPending) return <Loading />;
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      p={{ base: "2", md: "2" }}
      bg="white"
      width="100%"
      mb={6}
      minW={"100%"}
      cursor={"pointer"}
      py={{ base: 4, md: 2 }}
      onClick={() => {
        setSelected(Selected?.id === data.id ? null : data);
      }}
    >
      <Flex gap={4} align={"start"}>
        <Image
          src={`${imageBaseURL}/${data?.image}`}
          fallbackSrc="/imagePlaceholder.png"
          w={{ base: "80px", md: "80px" }}
          h={{ base: "80px", md: "80px" }}
          bgSize={"cover"}
          borderRadius={5}
        />
        <Box>
          {" "}
          <Text fontSize={"md"} fontWeight={600} m={0}>
            {data?.title}
          </Text>
          <Text fontSize={"sm"} fontWeight={600} m={0} color={"gray.500"}>
            {data?.offer_text}
          </Text>
          <Flex gap={2}>
            <Text fontSize={"sm"} fontWeight={600} m={0} color={"primary.text"}>
              {currency} {data?.total_price}
            </Text>
          </Flex>
          <Flex gap={2} align={"center"} mt={2}>
            <Text fontSize={"sm"} fontWeight={600} m={0} color={"gray.500"}>
              Qty : {data?.qty}
            </Text>
            <Box h={5}>
              {" "}
              <Divider orientation="vertical" />
            </Box>
            <Button
              colorScheme={"red"}
              size={"xs"}
              variant={"ghost"}
              fontSize={"xs"}
              backgroundColor={"red.50"}
              fontWeight={700}
              onClick={(e) => {
                e.stopPropagation();
                mutation.mutate(data.id);
              }}
            >
              Remove
            </Button>
          </Flex>
          <AnimatePresence>
            {Selected?.id === data.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Box>
                  <Divider my={3} />
                  <Flex gap={2} justify={"space-between"} align={"center"}>
                    {" "}
                    <Text
                      fontSize={"sm"}
                      fontWeight={600}
                      m={0}
                      color={"gray.500"}
                    >
                      MRP
                    </Text>
                    <Text
                      fontSize={"sm"}
                      fontWeight={600}
                      m={0}
                      color={"primary.text"}
                    >
                      {currency} {data?.mrp}
                    </Text>
                  </Flex>
                  <Flex gap={2} justify={"space-between"} align={"center"}>
                    {" "}
                    <Text
                      fontSize={"sm"}
                      fontWeight={600}
                      m={0}
                      color={"gray.500"}
                    >
                      PRICE
                    </Text>
                    <Text
                      fontSize={"sm"}
                      fontWeight={600}
                      m={0}
                      color={"primary.text"}
                    >
                      {currency} {data?.price}
                    </Text>
                  </Flex>
                  <Flex gap={2} justify={"space-between"} align={"center"}>
                    {" "}
                    <Text
                      fontSize={"sm"}
                      fontWeight={600}
                      m={0}
                      color={"gray.500"}
                    >
                      TAX
                    </Text>
                    <Text
                      fontSize={"sm"}
                      fontWeight={600}
                      m={0}
                      color={"primary.text"}
                    >
                      {data?.tax} %
                    </Text>
                  </Flex>
                  <Flex gap={2} justify={"space-between"} align={"center"}>
                    {" "}
                    <Text
                      fontSize={"sm"}
                      fontWeight={600}
                      m={0}
                      color={"gray.500"}
                    >
                      QTY
                    </Text>
                    <Text
                      fontSize={"sm"}
                      fontWeight={600}
                      m={0}
                      color={"primary.text"}
                    >
                      {data?.qty}
                    </Text>
                  </Flex>
                  <Divider my={1} />
                  <Flex gap={2} justify={"space-between"} align={"center"}>
                    {" "}
                    <Text
                      fontSize={"sm"}
                      fontWeight={600}
                      m={0}
                      color={"gray.500"}
                    >
                      Total
                    </Text>
                    <Text
                      fontSize={"sm"}
                      fontWeight={600}
                      m={0}
                      color={"primary.text"}
                    >
                      {currency} {data?.total_price}
                    </Text>
                  </Flex>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Flex>
    </Box>
  );
};

const calculateDiscount = (mrp, price) => {
  if (mrp <= 0) {
    return 0;
  }
  return (((mrp - price) / mrp) * 100).toFixed(2);
};

const calculateTaxAmount = (price, taxRate) => {
  if (price < 0 || taxRate < 0) {
    return 0;
  }
  return ((price * taxRate) / 100).toFixed(2);
};

const deliveryTax = (type) => {
  switch (type) {
    case "Delivery":
      return 20;
    case "Emergency Delivery":
      return 50;
    default:
      return 0;
  }
};

const Checkout = ({ items, address, setStep }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [useWallet, setuseWallet] = useState(false);
  const [DeliveryType, setDeliveryType] = useState("Delivery");
  const [deliveryTime, setdeliveryTime] = useState("Home Time");
  const [paymentType, setpaymentType] = useState("1");

  const GetTotalAmount = () => {
    let toatlBeforeDeliveryTax = items.reduce(
      (sum, item) => sum + item.total_price,
      0
    );
    return (
      parseFloat(toatlBeforeDeliveryTax) + parseFloat(deliveryTax(DeliveryType))
    );
  };
  const walletBalance = parseFloat(user.wallet_amount ?? user.balance ?? 0);

  const GetTotalPaybleAmount = () => {
    let remainsAfterWallet = GetTotalAmount() - walletBalance;
    if (useWallet) {
      if (remainsAfterWallet > 0) {
        return remainsAfterWallet.toFixed(2);
      } else if (remainsAfterWallet <= 0) {
        return 0;
      }
    } else {
      return GetTotalAmount().toFixed(2);
    }
  };
  const usedWalletAmount = () => {
    if (GetTotalAmount() >= walletBalance) {
      return walletBalance;
    } else {
      return GetTotalAmount();
    }
  };

  const placeOrder = async () => {
    let formData = {
      user_id: user.id,
      address_id: address.id,
      order_type: paymentType === "1" ? "Paid" : "Cod",
      final_total_amount: GetTotalAmount(),
      payment_transaction_id: paymentType === "1" ? "pay_93728" : null,
      payment_method: paymentType === "1" ? "Online" : null,
      delivery_type: DeliveryType,
      delivery_time_type: deliveryTime,
      delivery_charge: deliveryTax(DeliveryType),
      order_amount_before_charge: GetTotalAmount() - deliveryTax(DeliveryType),
      collection_type: "Collection",
      collection_time_type: "Office Time",
      service_charge: "60",
    };

    try {
      const res = await ADD(user.token, "add_cart_order", formData);
      if (res.response === 200) {
        showToast(toast, "success", "Success!");
        queryClient.invalidateQueries("cartdata");
        return res;
      } else {
        showToast(toast, "error", res.message);
        return res;
      }
    } catch (error) {
      return error;
    }
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      await placeOrder(data);
    },
    onSuccess: () => {
      setStep(1);
      queryClient.invalidateQueries("cartdata");
    },
    onError: (error) => {
      showToast(toast, "error", JSON.stringify(error));
    },
  });

  if (mutation.isPending) return <Loading />;

  return (
    <Box>
      <Box className="container" mt={0} minH={"50vh"}>
        <Flex gap={5} mt={2} align={"center"} justify={"center"}>
          <Box
            w={"600px"}
            maxW={"100vw"}
            border={"1px solid"}
            borderColor={"gray.200"}
            p={2}
            borderRadius={4}
            h={"fit-content"}
            bg={"#fff"}
          >
            {items.map((item) => (
              <Box
                key={item.id}
                borderWidth="1px"
                borderRadius="lg"
                overflow="hidden"
                p={{ base: "2", md: "2" }}
                bg="white"
                width="100%"
                mb={3}
                minW={"100%"}
                cursor={"pointer"}
                py={{ base: 4, md: 2 }}
              >
                <Flex gap={4} align={"start"} minW={"70%"}>
                  <Image
                    src={`${imageBaseURL}/${item?.image}`}
                    fallbackSrc="/imagePlaceholder.png"
                    w={{ base: "80px", md: "80px" }}
                    h={{ base: "80px", md: "80px" }}
                    bgSize={"cover"}
                    borderRadius={5}
                  />
                  <Box flex={3}>
                    {" "}
                    <Text fontSize={"md"} fontWeight={600} m={0}>
                      {item?.title}
                    </Text>
                    <Text
                      fontSize={"xs"}
                      fontWeight={600}
                      m={0}
                      color={"gray.600"}
                    >
                      {item?.qty_text}
                    </Text>
                    <Box>
                      <Divider my={3} />
                      <Flex gap={2} justify={"space-between"} align={"center"}>
                        {" "}
                        <Text
                          fontSize={"sm"}
                          fontWeight={600}
                          m={0}
                          color={"gray.500"}
                        >
                          MRP
                        </Text>
                        <Text
                          fontSize={"sm"}
                          fontWeight={600}
                          m={0}
                          color={"primary.text"}
                        >
                          {currency} {item?.mrp}
                        </Text>
                      </Flex>
                      <Flex gap={2} justify={"space-between"} align={"center"}>
                        {" "}
                        <Text
                          fontSize={"sm"}
                          fontWeight={600}
                          m={0}
                          color={"gray.500"}
                        >
                          Discount ( {calculateDiscount(item?.mrp, item?.price)}{" "}
                          %)
                        </Text>
                        <Text
                          fontSize={"sm"}
                          fontWeight={600}
                          m={0}
                          color={"primary.text"}
                        >
                          - {currency} {item?.mrp - item?.price}
                        </Text>
                      </Flex>
                      <Flex gap={2} justify={"space-between"} align={"center"}>
                        {" "}
                        <Text
                          fontSize={"sm"}
                          fontWeight={600}
                          m={0}
                          color={"gray.500"}
                        >
                          TAX {item?.tax} %
                        </Text>
                        <Text
                          fontSize={"sm"}
                          fontWeight={600}
                          m={0}
                          color={"primary.text"}
                        >
                          {calculateTaxAmount(item?.price, item.tax)}
                        </Text>
                      </Flex>
                      <Flex gap={2} justify={"space-between"} align={"center"}>
                        {" "}
                        <Text
                          fontSize={"sm"}
                          fontWeight={600}
                          m={0}
                          color={"gray.500"}
                        >
                          QTY
                        </Text>
                        <Text
                          fontSize={"sm"}
                          fontWeight={600}
                          m={0}
                          color={"primary.text"}
                        >
                          {item?.qty}
                        </Text>
                      </Flex>
                      <Divider my={1} />
                      <Flex gap={2} justify={"space-between"} align={"center"}>
                        {" "}
                        <Text
                          fontSize={"sm"}
                          fontWeight={600}
                          m={0}
                          color={"gray.500"}
                        >
                          Total
                        </Text>
                        <Text
                          fontSize={"sm"}
                          fontWeight={600}
                          m={0}
                          color={"primary.text"}
                        >
                          {currency} {item?.total_price}
                        </Text>
                      </Flex>
                    </Box>
                  </Box>
                </Flex>
              </Box>
            ))}

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
                <Text> {address.s_phone}</Text>
              </Flex>
              <Text fontWeight={600} color={"gray.600"} fontSize={"sm"}>
                {formatAddress(address)}
              </Text>
            </Box>
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
              <Flex
                fontWeight={600}
                align={"center"}
                gap={2}
                color={"gray.800"}
                fontSize={"md"}
              >
                {" "}
                <IoMdWallet fontSize={32} />
                <Text>
                  Your Wallet Balance {currency}
                  {walletBalance.toFixed(2)}
                </Text>
              </Flex>
            </Box>
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
              onClick={() => {
                setuseWallet(!useWallet);
              }}
            >
              <Flex
                fontWeight={600}
                align={"center"}
                color={"gray.800"}
                fontSize={"md"}
                justify={"space-between"}
              >
                {" "}
                <Text>Use Wallet Balance </Text>
                <Checkbox size={"lg"} isChecked={useWallet} />
              </Flex>
            </Box>
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
              onClick={() => {
                setuseWallet(!useWallet);
              }}
            >
              <RadioGroup
                fontWeight={600}
                fontSize={"sm"}
                value={paymentType}
                onChange={setpaymentType}
              >
                <Stack>
                  <Radio value="1" fontWeight={700}>
                    Pay Now
                  </Radio>
                  <Radio value="0" fontWeight={700}>
                    COD
                  </Radio>
                </Stack>
              </RadioGroup>
            </Box>
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
              <Text fontSize="md" fontWeight="bold" mb={4}>
                Product Delivery Details & Timing
              </Text>
              <RadioGroup onChange={setDeliveryType} value={DeliveryType}>
                <Stack spacing={4}>
                  <Box p={4} borderWidth="1px" borderRadius="md">
                    <Radio value="Delivery" alignItems={"start"}>
                      <Text fontSize="lg" fontWeight="semibold" mt={-1}>
                        Delivery
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Delivery Charges - ₹20.0
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Delivery - Expect your delivery within 24 to 28 hours
                        after your order is successful.
                      </Text>
                      <RadioGroup
                        onChange={setdeliveryTime}
                        value={deliveryTime}
                      >
                        {" "}
                        <Stack spacing={2} mt={2} pl={4}>
                          <Radio value="Home Time">
                            Home Time (8 AM to 8 PM)
                          </Radio>
                          <Radio value="Office Time">
                            Office Time (10 AM to 5 PM)
                          </Radio>
                        </Stack>
                      </RadioGroup>
                    </Radio>
                  </Box>
                  <Box p={4} borderWidth="1px" borderRadius="md">
                    <Radio
                      value="Emergency Delivery"
                      alignItems={"start"}
                      onClick={() => {
                        setdeliveryTime("null");
                      }}
                    >
                      <Text fontSize="lg" fontWeight="semibold" mt={-1}>
                        Emergency Delivery
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Delivery Charges - ₹50.0
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Urgent Dispatch: Your Product, Delivered Rapidly Within
                        Hours
                      </Text>
                    </Radio>
                  </Box>
                </Stack>
              </RadioGroup>
            </Box>
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
              <Text>
                {" "}
                <Flex gap={2} justify={"space-between"} align={"center"}>
                  {" "}
                  <Text
                    fontSize={"md"}
                    fontWeight={600}
                    m={0}
                    color={"gray.800"}
                  >
                    Total Amount
                  </Text>
                  <Text
                    fontSize={"md"}
                    fontWeight={600}
                    m={0}
                    color={"primary.text"}
                  >
                    {currency} {GetTotalAmount()}
                  </Text>
                </Flex>
                <Flex gap={2} justify={"space-between"} align={"center"}>
                  {" "}
                  <Text
                    fontSize={"md"}
                    fontWeight={600}
                    m={0}
                    color={"gray.800"}
                  >
                    Your Wallet Amount
                  </Text>
                  <Text
                    fontSize={"md"}
                    fontWeight={600}
                    m={0}
                    color={"primary.text"}
                  >
                    {currency} {walletBalance}
                  </Text>
                </Flex>
                <Flex gap={2} justify={"space-between"} align={"center"}>
                  {" "}
                  <Text
                    fontSize={"md"}
                    fontWeight={600}
                    m={0}
                    color={"gray.800"}
                  >
                    Used Wallet Amount
                  </Text>
                  <Text
                    fontSize={"md"}
                    fontWeight={600}
                    m={0}
                    color={useWallet ? "red.500" : "primary.text"}
                  >
                    - {currency} {useWallet ? `${usedWalletAmount()}` : 0}
                    {}
                  </Text>
                </Flex>
                <Flex gap={2} justify={"space-between"} align={"center"}>
                  {" "}
                  <Text
                    fontSize={"md"}
                    fontWeight={600}
                    m={0}
                    color={"gray.800"}
                  >
                    Total Payble Amount
                  </Text>
                  <Text
                    fontSize={"md"}
                    fontWeight={600}
                    m={0}
                    color={"primary.text"}
                  >
                    {currency} {GetTotalPaybleAmount()}
                  </Text>
                </Flex>
              </Text>
            </Box>
            <Box>
              <Flex bottom={5} w={"100%"} gap={5}>
                <Button
                  size={"sm"}
                  w={"30%"}
                  onClick={() => {
                    setStep(2);
                  }}
                >
                  Back
                </Button>
                <Button
                  size={"sm"}
                  w={"full"}
                  colorScheme={"green"}
                  onClick={() => {
                    mutation.mutate();
                  }}
                >
                  {paymentType === "1"
                    ? `Pay ${currency}${GetTotalPaybleAmount()}`
                    : "Order Now"}
                </Button>
              </Flex>
            </Box>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
};
