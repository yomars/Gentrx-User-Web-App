/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Skeleton,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
  useMediaQuery,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { ADD, GET, GET_AUTH } from "../Controllers/ApiControllers";
import currency from "../Controllers/currency";
import user from "../Controllers/user";
import { AddIcon, MinusIcon } from "@chakra-ui/icons";
import AddMoney from "./AddMoney";
import BalanceTransfer from "./BalanceTransfer";
import moment from "moment";
import { setStorageItem } from "../lib/storage";

const getTransaction = async () => {
  const patientCode = String(user?.patient_code || "").trim();
  const ownerId = patientCode || String(user?.id || "").trim();

  const urls = [];
  if (patientCode) {
    urls.push(
      `get_all_transaction?patient_code=${encodeURIComponent(patientCode)}&owner_id=${encodeURIComponent(ownerId)}&owner_type=patient&is_wallet_txn=1`
    );
  }
  urls.push(`get_all_transaction?user_id=${user?.id}&is_wallet_txn=1`);

  try {
    for (const url of urls) {
      const trasection = await GET(url);
      if (trasection?.response === 200) {
        return trasection.data || [];
      }
    }

    throw Error("Failed to fetch transactions");
  } catch (error) {
    console.error("Transaction fetch error:", error);
    // Return empty array instead of throwing to prevent infinite loading
    return [];
  }
};

const getLiveUserDetails = async () => {
  if (!user?.token) {
    return user;
  }

  try {
    const userRes = await GET_AUTH(user.token, "patient/me");
    const isSuccess = userRes?.response === 200 || userRes?.status === true;
    const payload = userRes?.data;

    if (!isSuccess || !payload || typeof payload !== "object") {
      return user;
    }

    const mergedUser = { ...user, ...payload };
    if (mergedUser.wallet_amount === undefined && mergedUser.balance !== undefined) {
      mergedUser.wallet_amount = mergedUser.balance;
    }
    if (mergedUser.balance === undefined && mergedUser.wallet_amount !== undefined) {
      mergedUser.balance = mergedUser.wallet_amount;
    }

    setStorageItem("user", JSON.stringify(mergedUser));
    return mergedUser;
  } catch {
    return user;
  }
};

function WalletModel({ isModalOpen, closeModal, openModal }) {
  const token = user?.token;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isTransferOpen, 
    onOpen: onTransferOpen, 
    onClose: onTransferClose 
  } = useDisclosure();
  const cancelRef = useRef();
  const [isMobile] = useMediaQuery("(max-width: 600px)");

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["wallet-user", user?.id, isModalOpen],
    queryFn: getLiveUserDetails,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
    enabled: !!user?.id && isModalOpen,
  });

  const walletBalance = Number(userData?.wallet_amount ?? userData?.balance ?? 0);

  const formatAmount = (value) => {
    const numericValue = Number(value || 0);
    return `${currency} ${numericValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <>
      {" "}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        isCentered
        scrollBehavior="inside"
        closeOnOverlayClick={false}
        size={isMobile ? "full" : "2xl"}
      >
        <ModalOverlay />
        <ModalContent p={0} m={0} borderRadius={{ base: 0, md: "20px" }}>
          <ModalBody p={0}>
            <ModalCloseButton zIndex={999} color={"#fff"} mt={1} mr={1} />
            <Box py={0} width={"100%"}>
              {isUserLoading ? (
                <Box
                  width={"100%"}
                  p={4}
                  borderRadius={5}
                  height={"220px"}
                  position={"relative"}
                  overflow={"hidden"}
                >
                  <Skeleton width={"100%"} height={"100%"} />
                </Box>
              ) : (
                <Box
                  width={"100%"}
                  p={{ base: 4, md: 5 }}
                  bgGradient={"linear(to-br, primary.main, tiber.main)"}
                  borderTopRadius={{ base: 0, md: "20px" }}
                  minH={{ base: "220px", md: "240px" }}
                  position={"relative"}
                  overflow={"hidden"}
                >
                  <Box
                    bg={"#1db954"}
                    w={{ base: 130, md: 170 }}
                    h={{ base: 130, md: 170 }}
                    borderRadius={"50%"}
                    position={"absolute"}
                    left={"-40px"}
                    bottom={"-45px"}
                    opacity={0.35}
                  ></Box>
                  <Box
                    bg={"#39d16f"}
                    w={{ base: 130, md: 190 }}
                    h={{ base: 130, md: 190 }}
                    borderRadius={"50%"}
                    position={"absolute"}
                    right={"-55px"}
                    top={"-60px"}
                    opacity={0.45}
                  ></Box>
                  <Stack spacing={4} color={"#fff"} position={"relative"} zIndex={2}>
                    <Flex justify={"space-between"} align={"center"} gap={3}>
                      <Box>
                        <Text fontWeight={600} m={0} fontSize={{ base: 18, md: 20 }}>
                          Patient Wallet
                        </Text>
                        <Text fontWeight={500} mt={1} mb={0} fontSize={{ base: 12, md: 13 }} color={"whiteAlpha.800"}>
                          Live balance from your account profile
                        </Text>
                      </Box>
                      <Badge bg={"whiteAlpha.300"} color={"#fff"} px={3} py={1} borderRadius={"full"}>
                        Active
                      </Badge>
                    </Flex>

                    <Box>
                      <Text fontSize={13} fontWeight={500} color={"whiteAlpha.800"} mb={1}>
                        Current Balance
                      </Text>
                      <Heading m={0} fontSize={{ base: "34px", md: "40px" }} lineHeight={1}>
                        {formatAmount(walletBalance)}
                      </Heading>
                    </Box>

                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                      <Button
                        size={"md"}
                        bg={"#54B435"}
                        color={"#fff"}
                        borderRadius={"12px"}
                        fontWeight={700}
                        _hover={{
                          transform: "translateY(-1px)",
                          boxShadow: "lg",
                          background: "#48a52f",
                        }}
                        onClick={onOpen}
                      >
                        Add Money
                      </Button>
                      <Button
                        size={"md"}
                        bg={"#54B435"}
                        color={"#fff"}
                        borderRadius={"12px"}
                        fontWeight={700}
                        _hover={{
                          transform: "translateY(-1px)",
                          boxShadow: "lg",
                          background: "#48a52f",
                        }}
                        onClick={onTransferOpen}
                      >
                        Balance Transfer
                      </Button>
                    </SimpleGrid>
                  </Stack>
                </Box>
              )}
              <Transection user={user} token={token} />
            </Box>
          </ModalBody>
          <ModalFooter px={4} py={3} borderTop={"1px solid"} borderColor={"gray.100"}>
            <Button
              w={"100%"}
              mt={1}
              bg={useColorModeValue("gray.800", "gray.500")}
              color={"white"}
              rounded={"10px"}
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "lg",
              }}
              onClick={closeModal}
              size={"sm"}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <AddMoney
        isOpen={isOpen}
        onClose={onClose}
        cancelRef={cancelRef}
        user={user}
        token={token}
        closeModal={closeModal}
        openModal={openModal}
      />
      <BalanceTransfer
        isOpen={isTransferOpen}
        onClose={onTransferClose}
        cancelRef={cancelRef}
      />
    </>
  );
}

export default WalletModel;

const Transection = () => {
  const { isLoading, data, error } = useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: getTransaction,
    refetchOnWindowFocus: false, // Disable auto-refetch to prevent constant loading
    refetchOnMount: true,
    staleTime: 60000, // Cache for 1 minute to reduce API calls
    retry: 1, // Only retry once to prevent infinite loading
    retryDelay: 1000, // Wait 1 second before retry
  });
  
  if (isLoading) {
    return (
      <Box py={5} px={1}>
        <Skeleton h={5}></Skeleton>

        <Box mt={5}>
          <Skeleton h={2}></Skeleton>
          <Skeleton h={2}></Skeleton>
          <Skeleton h={2}></Skeleton>
          <Skeleton h={2}></Skeleton>
          <Skeleton h={2}></Skeleton>
        </Box>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box px={1} mt={5}>
        <Alert status="warning">
          <AlertIcon />
          Failed to load transactions. Please refresh the page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box px={{ base: 3, md: 4 }} pb={2} maxH={{ base: "95vh", md: "420px" }} overflowY={"auto"}>
      <Flex justify={"space-between"} align={"center"} mt={4}>
        <Heading fontSize={{ base: 26, md: 28 }} mb={0} color={"gray.800"}>
          Transaction History
        </Heading>
        <Badge colorScheme={data?.length ? "green" : "gray"} borderRadius={"full"} px={2}>
          {data?.length || 0}
        </Badge>
      </Flex>

      <Box mt={4}>
        {!data?.length ? (
          <Alert status="warning" borderRadius={10}>
            <AlertIcon />
            No transaction found
          </Alert>
        ) : (
          <Stack spacing={3}>
            {data?.map((tran) => {
              const isCredit = tran.transaction_type === "Credited";
              const amountColor = isCredit ? "green.500" : "red.500";
              const statusLabel = isCredit ? "Credited" : "Debited";
              const description =
                tran?.notes ||
                (isCredit
                  ? "Amount credited to your wallet"
                  : "Amount debited from your wallet");

              return (
                <Box
                  key={tran.id}
                  border={"1px solid"}
                  borderColor={"gray.200"}
                  borderRadius={12}
                  p={3}
                  bg={"white"}
                >
                  <Flex gap={3} align={"flex-start"} justify={"space-between"}>
                    <Flex gap={3} align={"flex-start"} minW={0}>
                      <IconButton
                        icon={isCredit ? <AddIcon /> : <MinusIcon />}
                        size={"sm"}
                        borderRadius={"full"}
                        colorScheme={isCredit ? "green" : "red"}
                        aria-label={statusLabel}
                      />
                      <Box minW={0}>
                        <Text mb={0} fontSize={{ base: 28, md: 32 }} lineHeight={1} fontWeight={700} color={amountColor}>
                          {currency} {Number(tran?.amount || 0).toLocaleString()}
                        </Text>
                        <Text mt={1} mb={0} color={"gray.800"} fontSize={{ base: 16, md: 32 }} fontWeight={500} noOfLines={2}>
                          {description}
                        </Text>
                      </Box>
                    </Flex>

                    <Badge colorScheme={isCredit ? "green" : "red"} borderRadius={"full"} px={3} py={1} whiteSpace={"nowrap"}>
                      {statusLabel}
                    </Badge>
                  </Flex>

                  <Divider my={3} borderColor={"gray.200"} />

                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={2}>
                    <Text mb={0} fontSize={13} color={"gray.600"}>
                      Transaction ID: <Text as={"span"} color={"gray.800"} fontWeight={600}>{tran.id}</Text>
                    </Text>
                    <Text mb={0} fontSize={13} color={"gray.600"}>
                      Payment ID: <Text as={"span"} color={"gray.800"} fontWeight={600}>{tran.payment_transaction_id || "N/A"}</Text>
                    </Text>
                    <Text mb={0} fontSize={13} color={"gray.600"}>
                      {moment(tran.created_at).format("DD MMM YY hh:mm a")}
                    </Text>
                  </SimpleGrid>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
};
