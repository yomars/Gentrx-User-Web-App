import { BiCheckCircle } from "react-icons/bi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADD, GET } from "../Controllers/ApiControllers";
import {
  Box,
  Image,
  Text,
  Grid,
  GridItem,
  Button,
  useToast,
} from "@chakra-ui/react";
import imageBaseURL from "./../Controllers/image";
import "swiper/css";
import "swiper/css/pagination";
import Loading from "../Components/Loading";
import { useNavigate } from "react-router-dom";
import currency from "../Controllers/currency";
import { BiRightArrowCircle } from "react-icons/bi";
import useCartData from "../Hooks/CartData";
import user from "../Controllers/user";
import showToast from "../Controllers/ShowToast";
import ErrorPage from "./ErrorPage";
import NotAvailable from "../Components/NotAvailable";

export default function LabTests() {
  const { cartData, cartLoading } = useCartData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const getData = async () => {
    const res = await GET("get_lab_test");
    if (res.data.length < 5) {
      return [...res.data, ...res.data, ...res.data];
    } else {
      return res.data;
    }
  };
  const toast = useToast();

  const { isLoading, data, error } = useQuery({
    queryKey: ["Lab-tests"],
    queryFn: getData,
  });

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

  // cart details
  if (isLoading || (user && cartLoading) || mutation.isPending)
    return <Loading />;
  if (error) return <ErrorPage />;

  return (
    <Box>
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "20" }}>
        <Box className="container">
          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 32, md: 48 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Lab Test
          </Text>

          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 22, md: 32 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Discover a Comprehensive Range of <br />
            <Text as={"span"} color={"green.text"} fontWeight={800}>
              Lab Tests
            </Text>
          </Text>
        </Box>
      </Box>{" "}
      <Box
        mt={{ base: 0, md: 0 }}
        className="container"
        pt={5}
        position={"relative"}
      >
        {data ? (
          <>
            {" "}
            <Text
              fontSize={16}
              textAlign={"center"}
              mt={2}
              color={"gray.500"}
              fontWeight={500}
            >
              Experience precision and accuracy with our extensive selection of
              lab tests, <br /> expert for designed to provide detailed insights
              into your health.
            </Text>
            <Box>
              <Box mt={4}>
                {data?.length ? (
                  <Grid
                    templateColumns={{
                      base: "repeat(1, 1fr)",
                      md: "repeat(2, 1fr)",
                      lg: "repeat(3, 1fr)",
                    }}
                    gap={6}
                  >
                    {data?.map((item) => (
                      <GridItem
                        key={item.id}
                        backgroundColor={"#FFF"}
                        borderRadius={10}
                        cursor={"pointer"}
                        boxShadow={"2px 2px 20px 0 rgb(82 66 47 / 12%)"}
                        _hover={{ border: "1px solid #0032ff" }}
                        transition={"border 0.1s ease"}
                        border={"1px solid #fff"}
                        onClick={() => {
                          navigate(`/lab-test/${item.id}`);
                        }}
                      >
                        <Box
                          cursor={"pointer"}
                          gap={3}
                          boxShadow={"0 1px 4px #00000013!important"}
                          p={4}
                          bg={"#fff"}
                          borderRadius={8}
                          position={"relative"}
                        >
                          <Box
                            overflow={"hidden"}
                            h={"150px"}
                            w={"100%"}
                            borderRadius={5}
                            objectFit={"cover"}
                          >
                            {" "}
                            <Image
                              src={
                                item.image
                                  ? `${imageBaseURL}/${item.image}`
                                  : "/ctscan.svg"
                              }
                              w={"100%"}
                              alt={item.title}
                            />
                          </Box>
                          <Box mt={2}>
                            {" "}
                            <Text
                              mt={"2px"}
                              fontSize={{ base: "16px", md: "28px", lg: "18px" }}
                              fontWeight={600}
                              m={0}
                            >
                              {item.title}
                            </Text>
                            <Text
                              mt={"2px"}
                              fontSize={{ base: "14px", md: "14px", lg: "14px" }}
                              fontWeight={500}
                              m={0}
                            >
                              {item.sub_title}
                            </Text>
                            <Text
                              mt={"2px"}
                              fontSize={{ base: "16px", md: "16px", lg: "16px" }}
                              fontWeight={600}
                              m={0}
                              color={"primary.text"}
                            >
                              Starting From {currency}
                              {item.price.toFixed(2)}
                            </Text>
                            <Button
                              fontWeight={600}
                              size={"sm"}
                              colorScheme="green"
                              mt={4}
                              borderRadius={"30"}
                              minW={200}
                              onClick={(event) => {
                                if (!user) {
                                  return showToast(
                                    toast,
                                    "error",
                                    "Please Login First"
                                  );
                                }
                                event.stopPropagation();
                                mutation.mutate(item);
                              }}
                            >
                              {checkCart(item) ? (
                                <BiCheckCircle
                                  fontSize={20}
                                  style={{ marginRight: "5px" }}
                                />
                              ) : (
                                <BiRightArrowCircle
                                  fontSize={20}
                                  style={{ marginRight: "5px" }}
                                />
                              )}

                              {checkCart(item) ? "Added To Cart" : "Add to Cart"}
                            </Button>
                          </Box>
                          <Text
                            position={"absolute"}
                            mt={"2px"}
                            fontSize={{ base: "12px", md: "12px", lg: "12px" }}
                            fontWeight={500}
                            padding={"3px 15px"}
                            background={"primary.100"}
                            borderRadius={8}
                            right={2}
                            top={2}
                          >
                            {item.offer_text}
                          </Text>
                        </Box>
                      </GridItem>
                    ))}
                  </Grid>
                ) : (
                  <Box mt={6}>
                    <NotAvailable
                      name="Lab tests"
                      text="No lab tests are available right now. Please check back shortly or book a doctor consultation instead."
                    />
                    <Box textAlign="center" mt={4}>
                      <Button onClick={() => navigate("/doctors")} colorScheme="blue" size="sm">
                        Browse Doctors
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </>
        ) : null}
      </Box>
    </Box>
  );
}
