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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Skeleton,
  SkeletonText,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useMediaQuery,
  useToast,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useCallback } from "react";
import { ADD, GET, GET_AUTH } from "../Controllers/ApiControllers";
import currency from "../Controllers/currency";
import user from "../Controllers/user";
import { AddIcon, MinusIcon } from "@chakra-ui/icons";
import AddMoney from "./AddMoney";
import BalanceTransfer from "./BalanceTransfer";
import { setStorageItem } from "../lib/storage";
import {
  mapTransactionRow,
  getTransactionDescription,
  formatPesoAmount,
  formatTransactionDate,
} from "../lib/walletTransaction";

const getTransaction = async () => {
  // wallet transactions are keyed by patient_code; is_wallet_txn=1 limits to wallet rows.
  const patientCode = user?.patient_code;
  if (!patientCode) {
    return [];
  }
  let url = `get_all_transaction?patient_code=${encodeURIComponent(patientCode)}&is_wallet_txn=1`;
  try {
    const trasection = await GET(url);
    if (trasection.response != 200) {
      throw Error(trasection.messege || "Failed to fetch transactions");
    }
    const rows = trasection.data || [];
    return rows.map(mapTransactionRow).filter(Boolean);
  } catch (error) {
    console.error("Transaction fetch error:", error);
    throw error;
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
  const queryClient = useQueryClient();
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

  const handleTransferSuccess = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["wallet-user", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["user"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    ]);
  };

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
        senderUser={userData || user}
        walletBalance={walletBalance}
        onTransferSuccess={handleTransferSuccess}
      />
    </>
  );
}

export default WalletModel;

// ─── Copy helper ─────────────────────────────────────────────────────────────

function CopyableId({ label, value }) {
  const toast = useToast();
  const displayValue = value ?? "--";

  const handleCopy = useCallback(() => {
    if (!value) return;
    try {
      navigator.clipboard.writeText(String(value));
      toast({ title: `${label} copied`, status: "success", duration: 1500, isClosable: true, position: "top" });
    } catch {
      /* clipboard unavailable – silent fail */
    }
  }, [value, label, toast]);

  return (
    <Flex align="center" gap={1} minW={0}>
      <Text mb={0} fontSize={12} color={"gray.500"} flexShrink={0}>
        {label}:
      </Text>
      <Tooltip label={value ? `Copy ${label}` : ""} placement="top" isDisabled={!value}>
        <Text
          as="span"
          mb={0}
          fontSize={12}
          fontFamily={"mono"}
          color={"gray.800"}
          fontWeight={600}
          cursor={value ? "pointer" : "default"}
          _hover={value ? { color: "blue.500", textDecoration: "underline" } : {}}
          onClick={handleCopy}
          isTruncated
        >
          {displayValue}
        </Text>
      </Tooltip>
    </Flex>
  );
}

// ─── Transaction list skeleton ────────────────────────────────────────────────

function TransactionSkeleton() {
  return (
    <Stack spacing={3} mt={4}>
      {[1, 2, 3].map((n) => (
        <Box key={n} border={"1px solid"} borderColor={"gray.100"} borderRadius={12} p={4}>
          <Flex gap={3} align="center" mb={3}>
            <Skeleton w={8} h={8} borderRadius="full" flexShrink={0} />
            <Box flex={1}>
              <Skeleton h={6} w="40%" mb={2} />
              <SkeletonText noOfLines={1} w="70%" />
            </Box>
            <Skeleton h={6} w={16} borderRadius="full" />
          </Flex>
          <Skeleton h={"1px"} mb={3} />
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={2}>
            <Skeleton h={4} />
            <Skeleton h={4} />
            <Skeleton h={4} />
          </SimpleGrid>
        </Box>
      ))}
    </Stack>
  );
}

// ─── Transection ─────────────────────────────────────────────────────────────

const Transection = () => {
  const { isLoading, data, error, refetch, isFetching } = useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: getTransaction,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 60000,
    retry: 1,
    retryDelay: 1000,
  });

  if (isLoading) {
    return (
      <Box px={{ base: 3, md: 4 }} pb={2}>
        <Skeleton h={7} w="55%" mt={4} mb={4} borderRadius={6} />
        <TransactionSkeleton />
      </Box>
    );
  }

  if (error) {
    return (
      <Box px={{ base: 3, md: 4 }} pb={4} mt={4}>
        <Alert status="error" borderRadius={10} flexDirection="column" alignItems="flex-start" gap={2}>
          <Flex align="center" gap={2}>
            <AlertIcon m={0} />
            <Text mb={0} fontWeight={600}>Failed to load transactions</Text>
          </Flex>
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            onClick={() => refetch()}
            isLoading={isFetching}
            loadingText="Retrying…"
          >
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box px={{ base: 3, md: 4 }} pb={2} maxH={{ base: "95vh", md: "420px" }} overflowY={"auto"}>
      <Flex justify={"space-between"} align={"center"} mt={4} mb={1}>
        <Heading fontSize={{ base: 20, md: 22 }} mb={0} color={"gray.800"}>
          Transaction History
        </Heading>
        <Badge
          colorScheme={data?.length ? "green" : "gray"}
          borderRadius={"full"}
          px={2}
          py={0.5}
          fontSize={12}
        >
          {data?.length || 0}
        </Badge>
      </Flex>

      <Box mt={3}>
        {!data?.length ? (
          <Alert status="info" borderRadius={10}>
            <AlertIcon />
            No transactions found
          </Alert>
        ) : (
          <Stack spacing={3}>
            {data.map((tx) => {
              const isCredit = tx.type === "Credited";
              const amountColor = isCredit ? "green.600" : "red.500";
              const badgeColorScheme = isCredit ? "green" : "red";
              const description = getTransactionDescription(tx);

              return (
                <Box
                  key={tx.id ?? Math.random()}
                  border={"1px solid"}
                  borderColor={"gray.200"}
                  borderRadius={12}
                  p={{ base: 3, md: 4 }}
                  bg={"white"}
                  _hover={{ borderColor: "gray.300", boxShadow: "sm" }}
                  transition="border-color 0.15s, box-shadow 0.15s"
                >
                  {/* ─ Top row: icon + amount + badge ─ */}
                  <Flex gap={3} align={"center"} justify={"space-between"}>
                    <Flex gap={2} align={"center"} minW={0} flex={1}>
                      <Box
                        w={8}
                        h={8}
                        borderRadius={"full"}
                        bg={isCredit ? "green.50" : "red.50"}
                        border={"2px solid"}
                        borderColor={isCredit ? "green.200" : "red.200"}
                        display={"flex"}
                        alignItems={"center"}
                        justifyContent={"center"}
                        flexShrink={0}
                      >
                        {isCredit
                          ? <AddIcon color={"green.600"} boxSize={3} />
                          : <MinusIcon color={"red.500"} boxSize={3} />}
                      </Box>
                      <Text
                        mb={0}
                        fontSize={{ base: "lg", md: "xl" }}
                        lineHeight={1}
                        fontWeight={800}
                        color={isCredit ? "green.700" : "red.500"}
                        letterSpacing="-0.3px"
                      >
                        {formatPesoAmount(tx.amount)}
                      </Text>
                    </Flex>

                    <Badge
                      colorScheme={badgeColorScheme}
                      variant="outline"
                      borderRadius={"full"}
                      px={3}
                      py={1}
                      fontSize={11}
                      fontWeight={600}
                      whiteSpace={"nowrap"}
                      flexShrink={0}
                    >
                      {tx.type === "Unknown" ? "Pending" : tx.type}
                    </Badge>
                  </Flex>

                  {/* ─ Description ─ */}
                  <Text
                    mt={2}
                    mb={0}
                    color={"gray.600"}
                    fontSize={13}
                    fontWeight={400}
                    noOfLines={3}
                    lineHeight={1.5}
                  >
                    {description}
                  </Text>

                  <Divider my={2} borderColor={"gray.100"} />

                  {/* ─ Meta row: IDs + date ─ */}
                  <Stack spacing={1}>
                    <CopyableId label="Transaction ID" value={tx.id != null ? String(tx.id) : null} />
                    <CopyableId label="Payment Transaction ID" value={tx.paymentTransactionId} />
                    <Flex align="center" gap={1}>
                      <Text mb={0} fontSize={12} color={"gray.500"} flexShrink={0}>Date:</Text>
                      <Text mb={0} fontSize={12} fontFamily={"mono"} color={"gray.700"}>
                        {formatTransactionDate(tx.createdAt)}
                      </Text>
                    </Flex>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
};
