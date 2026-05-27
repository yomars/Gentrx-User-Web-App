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
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftAddon,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { POST_JSON } from "../Controllers/ApiControllers";
import currency from "../Controllers/currency";
import showToast from "../Controllers/ShowToast";

const BalanceTransfer = ({
  isOpen,
  onClose,
  cancelRef,
  senderUser,
  walletBalance,
  onTransferSuccess,
}) => {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleChange = (e) => {
    const rawValue = e.target.value;
    const cleaned = rawValue.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    const normalized =
      parts.length > 2
        ? `${parts[0]}.${parts.slice(1).join("")}`
        : cleaned;
    const [whole, decimal = ""] = normalized.split(".");
    const nextValue = decimal !== "" ? `${whole}.${decimal.slice(0, 2)}` : whole;
    setAmount(nextValue.slice(0, 10));
  };

  const normalizePhone = (value) => value.replace(/[^0-9]/g, "");

  const normalizeRecipientPhoneForSubmit = (value) => {
    const digits = normalizePhone(value);

    if (digits.length === 10) {
      return digits;
    }

    if (digits.length === 11 && digits.startsWith("0")) {
      return digits.slice(1);
    }

    if (digits.length === 12 && digits.startsWith("63")) {
      return digits.slice(2);
    }

    return null;
  };

  const handleTransfer = async () => {
    if (!amount || !phone || !senderUser?.token) {
      showToast(toast, "error", "Please fill all required fields");
      return;
    }

    const amountValue = Number(amount);
    const normalizedPhone = normalizeRecipientPhoneForSubmit(phone);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      showToast(toast, "error", "Please enter a valid transfer amount");
      return;
    }

    if (!normalizedPhone) {
      showToast(
        toast,
        "error",
        "Recipient phone must be a valid mobile number"
      );
      return;
    }

    if (amountValue > Number(walletBalance || 0)) {
      showToast(toast, "error", "Insufficient balance");
      return;
    }

    if (!senderUser?.id || !senderUser?.patient_code) {
      showToast(toast, "error", "Session data is incomplete. Please log in again.");
      return;
    }

    const data = {
      // Keep both identifiers for temporary backend compatibility during migration.
      from_user_id: senderUser.id,
      from_patient_code: senderUser.patient_code,
      patient_code: senderUser.patient_code,
      to_phone: normalizedPhone,
      amount: amountValue,
      description: description || "Balance transfer between users",
      transaction_reference: `BT-${Date.now()}-${senderUser.id}`,
    };

    try {
      setIsLoading(true);
      const response = await POST_JSON(senderUser.token, "balance_transfer", data);

      if (response.status) {
        showToast(toast, "success", response.message);
        setAmount("");
        setPhone("");
        setDescription("");
        if (typeof onTransferSuccess === "function") {
          await onTransferSuccess();
        }
        onClose();
      } else {
        showToast(
          toast,
          "error",
          response?.message || response?.msg || "Transfer failed"
        );
      }
    } catch (error) {
      showToast(toast, "error", error.message || "Transfer failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent p={0}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Transfer Balance
          </AlertDialogHeader>

          <AlertDialogBody>
            <FormControl mb={4}>
              <FormLabel>Recipient Phone Number</FormLabel>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(normalizePhone(e.target.value))}
                placeholder="Enter recipient's phone number"
                maxLength={12}
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Amount</FormLabel>
              <InputGroup>
                <InputLeftAddon children={currency} />
                <Input
                  type="tel"
                  value={amount}
                  onChange={handleChange}
                  placeholder="Enter amount to transfer"
                  maxLength={10}
                />
              </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel>Description: </FormLabel>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter transfer description"
              />
            </FormControl>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={handleTransfer}
              ml={3}
              w={"120px"}
              isLoading={isLoading}
              isDisabled={isLoading}
            >
              Transfer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default BalanceTransfer;
