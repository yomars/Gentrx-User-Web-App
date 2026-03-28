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
import { ADD } from "../Controllers/ApiControllers";
import currency from "../Controllers/currency";
import user from "../Controllers/user";
import showToast from "../Controllers/ShowToast";

const BalanceTransfer = ({ isOpen, onClose, cancelRef }) => {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleChange = (e) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setAmount(numericValue.slice(0, 5));
  };

  const handleTransfer = async () => {
    if (!amount || !phone) {
      showToast(toast, "error", "Please fill all required fields");
      return;
    }

    if (parseFloat(amount) > user.wallet_amount) {
      showToast(toast, "error", "Insufficient balance");
      return;
    }

    const data = {
      from_user_id: user.id,
      to_phone: phone,
      amount: parseFloat(amount),
      description: description || "Balance transfer between users",
    };

    try {
      setIsLoading(true);
      const response = await ADD(user.token, "balance_transfer", data);

      if (response.status) {
        showToast(toast, "success", response.message);
        setAmount("");
        setPhone("");
        setDescription("");
        onClose();
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
                onChange={(e) => setPhone(e.target.value)}
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
