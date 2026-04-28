/* eslint-disable react/no-children-prop */
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
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, lazy, Suspense } from "react";
import { ADD } from "../Controllers/ApiControllers";
import currency from "../Controllers/currency";
import user from "../Controllers/user";
import showToast from "../Controllers/ShowToast";
const StripePaymentController = lazy(() => import("../Controllers/StripePayController"));
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
  const normalizedPaymentMethod = `${paymentMethod || ""}`.trim().toLowerCase();
  const canonicalPatientCode = String(user?.patient_code || "").trim();
  const walletOwnerId = canonicalPatientCode || String(user?.id || "").trim();

  const buildWalletCreditPayload = (transactionId) => ({
    user_id: user.id,
    patient_code: canonicalPatientCode,
    owner_id: walletOwnerId,
    owner_type: "patient",
    amount: amount,
    payment_transaction_id: transactionId,
    transaction_reference: transactionId,
    payment_method: normalizedPaymentMethod || paymentMethod,
    transaction_type: "Credited",
    description: "Amount credited to user wallet",
  });

  useEffect(() => {
    if (paymentGetwaysData) {
      setPaymentMethod(`${paymentGetwaysData.title || ""}`.trim().toLowerCase());
    }
  }, [paymentGetwaysData]);

  useEffect(() => {
    if (!paymentIsOpen) {
      return;
    }

    const method = `${paymentMethod || ""}`.trim().toLowerCase();
    if (method === "stripe") {
      return;
    }

    setisPaymentLoading(false);
    paymentClose();
    showToast(toast, "error", "Payment method is unavailable. Please try again.");
  }, [paymentIsOpen, paymentMethod, paymentClose, toast]);

  const paymentData = {
    amount: parseFloat(amount).toFixed(2),
    user_id: user.id,
    patient_code: canonicalPatientCode,
    owner_id: walletOwnerId,
    owner_type: "patient",
    desc: `Wallet Recharge Transaction for userid -  ${user.id}`,
    method: normalizedPaymentMethod,
    payment_method: "Online",
    transaction_type: "Credited",
    description: "Amount credited to user wallet",
    name: `${user.f_name} ${user.l_name}`,
  };

  // Razorpay success callback — credit the wallet then reopen the wallet modal
  const rzpNextFn = async (paymentId) => {
    const resolvedTransactionId = paymentId || `rzp-${Date.now()}`;
    const creditData = {
      ...buildWalletCreditPayload(resolvedTransactionId),
      payment_method: "razorpay",
    };
    setisPaymentLoading(true);
    try {
      const res = await ADD(user.token, "add_wallet_money", creditData);
      setisPaymentLoading(false);
      if (res.response === 200) {
        showToast(toast, "success", "Wallet loaded successfully!");
        queryClient.invalidateQueries({ queryKey: ["user"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        openModal();
      } else {
        showToast(toast, "error", res.message || "Failed to credit wallet.");
      }
    } catch (error) {
      setisPaymentLoading(false);
      showToast(toast, "error", "Something went wrong!");
    }
  };

  const isPaymentButtonLoading = paymentGetwaysLoading || isPaymentLoading;

  const handleChange = (e) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setAmount(numericValue.slice(0, 5));
  };

  const AddMoney = async (txnID) => {
    const resolvedTransactionId = txnID || `wallet-topup-${Date.now()}`;
    let data = {
      ...buildWalletCreditPayload(resolvedTransactionId),
      payment_method: paymentMethod,
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

    const normalizedMethod = normalizedPaymentMethod;
    const isSupportedMethod = normalizedMethod === "stripe";

    if (!isSupportedMethod) {
      return toast({
        title: "Unsupported payment method.",
        description: "Please contact support or refresh the page.",
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
      setisPaymentLoading(false);
      onClose(); // always close the AddMoney dialog
      // Only close wallet modal for Stripe (which redirects away).
      // For Razorpay the wallet stays open – user can retry if payment fails.
      if (normalizedMethod === "stripe") {
        closeModal();
      }
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
                isLoading={isPaymentButtonLoading}
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
          {normalizedPaymentMethod === "stripe" && (
            <Suspense fallback={null}>
              <StripePaymentController
                isOpen={paymentIsOpen}
                onClose={paymentClose}
                nextFn={AddMoney}
                data={paymentData}
                cancelFn={() => setisPaymentLoading(false)}
                type={"Wallet"}
              />
            </Suspense>
          )}
          {/* Razorpay is disabled */}
        </>
      )}
    </>
  );
};

export default AddMoney;
