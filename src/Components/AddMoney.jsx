﻿/* eslint-disable react/no-children-prop */
/* eslint-disable react/prop-types */
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  InputGroup,
  InputLeftAddon,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ADD } from "../Controllers/ApiControllers";
import Loading from "./Loading";
import currency from "../Controllers/currency";
import user from "../Controllers/user";
import showToast from "../Controllers/ShowToast";
import StripePaymentController from "../Controllers/StripePayController";
import RazorpayPaymentController from "../Controllers/RazorpayPaymentController";
import PaymentGetwayData from "../Hooks/Paymntgetways"; // Import icons if needed
let minAmount = 100;

const AddMoney = ({ isOpen, onClose, cancelRef, closeModal, openModal }) => {
  const { paymentGetwaysLoading, paymentGetwaysData } = PaymentGetwayData();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isPaymentLoading, setisPaymentLoading] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  const {
    isOpen: paymentIsOpen,
    onOpen: paymentOpen,
    onClose: paymentClose,
  } = useDisclosure();

  useEffect(() => {
    if (paymentGetwaysData) {
      setPaymentMethod(paymentGetwaysData.title.toLowerCase());
    }
  }, [paymentGetwaysData]);

  const paymentData = {
    amount: parseFloat(amount).toFixed(2),
    user_id: user.id,
    desc: `Wallet Recharge Transaction for userid -  ${user.id}`,
    method: paymentMethod,
    payment_method: "Online",
    transaction_type: "Credited",
    description: "Amount credited to user wallet",
    name: `${user.f_name} ${user.l_name}`,
  };

  const reLogin = async () => {
    let data = { phone: user?.phone };
    let token = user.token;
    const login = await ADD(token, "re_login_phone", data);
    if (login.response === 200) {
      localStorage.setItem(
        "user",
        JSON.stringify({ ...login.data, token: user.token })
      );
      return login.data;
    } else {
      toast({
        title: login.message || "Something went wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const rzpNextFn = async () => {
    let data = { phone: user?.phone };
    let token = user.token;
    setisPaymentLoading(true);
    const login = await ADD(token, "re_login_phone", data);
    setisPaymentLoading(false);
    if (login.response === 200) {
      localStorage.setItem(
        "user",
        JSON.stringify({ ...login.data, token: user.token })
      );
      toast({
        title: "Success",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      openModal();
    } else {
      toast({
        title: login.message || "Something went wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const { isLoading: isUserLoading } = useQuery({
    queryKey: ["user"],
    queryFn: reLogin,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  if (isUserLoading || paymentGetwaysLoading) return <Loading />;

  const handleChange = (e) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setAmount(numericValue.slice(0, 5));
  };

  const AddMoney = async (txnID) => {
    let data = {
      user_id: user.id,
      amount: amount,
      payment_transaction_id: txnID || "Test",
      payment_method: paymentMethod,
      transaction_type: "Credited",
      description: "Amount credited to user wallet",
    };
    try {
      setisPaymentLoading(true);
      let res = await ADD(user.token, "add_wallet_money", data);
      setisPaymentLoading(false);
      if (res.response === 200) {
        onClose();
        showToast(toast, "success", "Success!");
        queryClient.invalidateQueries("user");
        openModal();
      } else {
        showToast(toast, "error", res.message);
      }
    } catch (error) {
      setisPaymentLoading(false);
      showToast(toast, "error", "Something went wrong!");
    }
  };

  const handleSubmit = () => {
    if (!paymentMethod) {
      return toast({
        title: `No active payment methods!`,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    }
    if (amount < 100) {
      toast({
        title: `Make sure the amount is ${currency} 100  or above`,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    } else {
      setisPaymentLoading(true);
      onClose();
      closeModal();
      paymentOpen();
    }
  };

  return (
    <>
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent p={0}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Add Money To Your Wallet
            </AlertDialogHeader>

            <AlertDialogBody>
              <FormControl>
                <FormLabel>Enter Amount</FormLabel>
                <InputGroup>
                  <InputLeftAddon children={currency} />
                  <Input
                    type="tel"
                    value={amount}
                    onChange={handleChange}
                    placeholder="Enter amount in rupees"
                    pr="2.5rem"
                    maxLength={5}
                  />
                </InputGroup>

                <FormHelperText>
                  {minAmount
                    ? `Minimum ${minAmount} ${currency} required to place this order`
                    : `Make sure the amount is  ${currency} 100 or above`}
                </FormHelperText>
              </FormControl>

              <Flex w={"100%"} gap={5} mt={5}>
                {[250, 500, 1000, 1500, 2000].map((amount) => (
                  <Button
                    key={amount}
                    colorScheme="gray"
                    variant={"outline"}
                    size={"sm"}
                    onClick={() => setAmount(amount)}
                    mr={2}
                  >
                    {amount}
                  </Button>
                ))}
              </Flex>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="green"
                onClick={handleSubmit}
                ml={3}
                w={"120px"}
                isLoading={
                  isUserLoading ||
                  paymentGetwaysLoading ||
                  (paymentMethod === "razorpay" && isPaymentLoading)
                }
              >
                Add
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Payment Controllers based on selected payment method */}
      {paymentIsOpen && (
        <>
          {paymentMethod === "stripe" && (
            <StripePaymentController
              isOpen={paymentIsOpen}
              onClose={paymentClose}
              nextFn={AddMoney}
              data={paymentData}
              cancelFn={() => setisPaymentLoading(false)}
              type={"Wallet"}
            />
          )}
          {paymentMethod === "razorpay" && (
            <RazorpayPaymentController
              isOpen={paymentIsOpen}
              onClose={paymentClose}
              nextFn={rzpNextFn}
              data={paymentData}
              cancelFn={() => setisPaymentLoading(false)}
              type={"Wallet"}
            />
          )}
        </>
      )}
    </>
  );
};

export default AddMoney;
