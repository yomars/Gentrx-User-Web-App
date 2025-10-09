import {
  Box,
  Image,
  Text,
  Badge,
  Stack,
  HStack,
  VStack,
  Heading,
  Divider,
  Button,
  useToast,
} from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "../Components/Loading";
import { ADD, GET } from "../Controllers/ApiControllers";
import imageBaseURL from "../Controllers/image";
import { BiCheckCircle, BiRightArrowCircle } from "react-icons/bi";
import useCartData from "../Hooks/CartData";
import user from "../Controllers/user";
import showToast from "../Controllers/ShowToast";

export default function LabTestDetails() {
  const { id } = useParams();
  const { cartData, cartLoading } = useCartData();
  const toast = useToast();
  const queryClient = useQueryClient();

  const getData = async () => {
    const res = await GET(`get_lab_test/${id}`);
    return res.data;
  };
  const { isLoading, data: labTest } = useQuery({
    queryKey: ["Lab-test", id],
    queryFn: getData,
  });

  // check item is exist in the cart
  const checkCart = (item) => {
    if (user) {
      let isExist = false;
      cartData.forEach((element) => {
        if (element.lab_test_id === item.id) {
          isExist = true;
        }
      });
      return isExist;
    } else {
      return false;
    }
  };

  const getTotalPrice = (price, tax) => {
    const taxAmount = (price / 100) * tax;
    return parseFloat(price) + parseFloat(taxAmount);
  };
  // add to cart
  const addToCart = async (product) => {
    let LabData = {
      user_id: user.id,
      product_id: null,
      price: product.price ?? "",
      total_price: getTotalPrice(product.price, product.tax) ?? "",
      mrp: product.mrp ?? "",
      tax: product.tax ?? "",
      qty: 1 ?? "",
      qty_text: "",
      lab_test_id: product.id,
    };
    try {
      const res = await ADD(user.token, "add_cart", LabData);
      if (res.response === 200) {
        showToast(toast, "success", "Added to cart!");
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
      await addToCart(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries("cartdata");
    },
    onError: (error) => {
      showToast(toast, "error", JSON.stringify(error));
    },
  });

  if (isLoading || (user && cartLoading) || mutation?.isPending) return <Loading />;

  return (
    <Box minH={"50vh"}>
      {mutation.isPending ? <Loading /> : ""}
      <div className="container">
        <Box
          p={[2, 4, 5]}
          shadow="lg"
          borderWidth="1px"
          borderRadius="lg"
          maxW="3xl"
          mx="auto"
          bg="white"
          mt={10}

          // Parent onClick handler
        >
          <HStack
            spacing={[2, 4, 6]}
            flexDirection={["column", "column", "row"]}
            align="center"
          >
            <Image
              boxSize={{ base: "100%", md: "200px" }}
              objectFit="cover"
              src={
                labTest.image
                  ? `${imageBaseURL}/${labTest.image}`
                  : "/ctscan.svg"
              }
              alt={labTest.title}
              borderRadius="md"
            />
            <VStack align="start" spacing={[2, 2]}>
              <Text fontSize={["sm", "md"]} color="gray.400" fontWeight="bold">
                {labTest.lab_cat_title}
              </Text>
              <Heading size={["lg", "lg"]} color="primary.text">
                {labTest.title}
              </Heading>
              <Text fontSize={["sm", "md"]} color="gray.500">
                {labTest.sub_title}
              </Text>
              <Badge
                colorScheme="green"
                fontSize={["0.7em", "0.9em"]}
                paddingX={4}
              >
                {labTest.offer_text}
              </Badge>
              <Text fontSize={["sm", "md"]} color="gray.600">
                {labTest.description}
              </Text>
            </VStack>
          </HStack>
          <Divider my={[2, 3, 4]} />
          <Stack
            direction={["column", "row"]}
            spacing={[4, 5, 4]}
            justify="space-between"
            align={["left", "center"]}
          >
            <Box>
              <Text
                fontSize={["lg", "xl"]}
                fontWeight="bold"
                color="primary.text"
              >
                ₹{labTest.price}
              </Text>
              <HStack>
                <Text fontSize={["xs", "sm"]} color="gray.500" as="del">
                  ₹{labTest.mrp}
                </Text>
                <Text fontSize={["xs", "sm"]} color="gray.500">
                  (Inclusive of {labTest.tax}% tax)
                </Text>
              </HStack>
            </Box>
            <Button
              colorScheme="green"
              size="sm"
              leftIcon={
                checkCart(labTest) ? (
                  <BiCheckCircle fontSize={20} style={{ marginRight: "5px" }} />
                ) : (
                  <BiRightArrowCircle
                    fontSize={20}
                    style={{ marginRight: "5px" }}
                  />
                )
              }
              minW={"200px"}
              onClick={() => {
                if (!user) {
                  return showToast(toast, "error", "Please Login First");
                }
                mutation.mutate(labTest);
              }}
            >
              {checkCart(labTest) ? "Added To Cart" : "Add to Cart"}
            </Button>
          </Stack>
        </Box>
      </div>
    </Box>
  );
}
