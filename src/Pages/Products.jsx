/* eslint-disable react/prop-types */
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Image,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "../Components/Loading";
import { ADD, GET } from "../Controllers/ApiControllers";
import imageBaseURL from "../Controllers/image";
import { useNavigate } from "react-router-dom";
import currency from "../Controllers/currency";
import user from "../Controllers/user";
import useCartData from "../Hooks/CartData";
import showToast from "../Controllers/ShowToast";
import { BiCheckCircle, BiRightArrowCircle } from "react-icons/bi";
import ErrorPage from "./ErrorPage";

const getCat = async () => {
  const res = await GET("get_product_cat");
  return res.data;
};
const getProducts = async () => {
  const res = await GET("get_product");
  return res.data;
};

// add to cart

function Products() {
  const { isLoading: catLoading, data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: getCat,
  });
  const {
    isLoading: productLoading,
    data: productData,
    error,
  } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  //

  if (catLoading || productLoading) {
    return <Loading />;
  }

  if (error) return <ErrorPage />;
  return (
    <Box>
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "10" }}>
        <Box className="container">
          <Text
            fontSize={{ base: 28, md: 40 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Products
          </Text>
        </Box>
      </Box>
      <Box className="container">
        <Box>
          <Flex mt={5} gap={5} flexDir={{ base: "column", md: "row" }}>
            <Box w={{ base: "100%", md: "70%" }}>
              <Grid
                templateColumns={{
                  base: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                  lg: "repeat(3, 1fr)",
                }}
                gap={6}
              >
                {productData?.map((data) => (
                  <GridItem
                    key={data.id}
                    backgroundColor={"#FFF"}
                    borderRadius={10}
                    cursor={"pointer"}
                    boxShadow={"2px 2px 20px 0 rgb(82 66 47 / 12%)"}
                    _hover={{ border: "1px solid #0032ff" }}
                    transition={"border 0.1s ease"}
                    border={"1px solid #fff"}
                  >
                    <Product key={data?.id} data={data} />
                  </GridItem>
                ))}
              </Grid>
            </Box>
            <Box
              w={{ base: "100%", md: "30%" }}
              bg={"#fff"}
              borderRadius={8}
              h={"fit-content"}
              p={4}
              boxShadow={"2px 2px 20px 0 rgb(82 66 47 / 12%)"}
            >
              <Text fontSize={20} textAlign={"center"} fontWeight={500}>
                Explore Other Categories
              </Text>

              <Box mt={10}>
                <Grid
                  templateColumns={{
                    base: "repeat(3, 1fr)",
                    md: "repeat(3, 1fr)",
                    lg: "repeat(3, 1fr)",
                  }}
                  gap={6}
                >
                  {catData.map((cat) => (
                    <GridItem
                      key={cat.id}
                      w={"100%"}
                      mb={5}
                      size={"sm"}
                      colorScheme="green"
                      _hover={{ border: "1px solid #0032ff" }}
                      transition={"border 0.1s ease"}
                      border={"1px solid"}
                      borderColor={"gray.200"}
                      p={2}
                      borderRadius={4}
                      cursor={"pointer"}
                      boxShadow={"lg"}
                    >
                      <Box align={"center"}>
                        {" "}
                        <Image
                          src={`${imageBaseURL}/department/2024-01-11-65a01d934267d.png`}
                          w={"50px"}
                          fallbackSrc="/imagePlaceholder.png"
                        />
                        <Text
                          fontSize={"xs"}
                          textAlign={"center"}
                          fontWeight={500}
                          textTransform={"capitalize"}
                        >
                          {cat.title}
                        </Text>
                      </Box>
                    </GridItem>
                  ))}
                </Grid>
              </Box>
            </Box>
          </Flex>
        </Box>
      </Box>
    </Box>
  );
}

const Product = ({ data }) => {
  const { cartData, cartLoading } = useCartData();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  //
  const getTotalPrice = (price, tax) => {
    const taxAmount = (price / 100) * tax;
    return parseFloat(price) + parseFloat(taxAmount);
  };
  const addToCart = async (product) => {
    let LabData = {
      user_id: user.id,
      product_id: product.id,
      price: product.price ?? "",
      total_price: getTotalPrice(product.price, product.tax) ?? "",
      mrp: product.mrp ?? "",
      tax: product.tax ?? "",
      qty: 1 ?? "",
      qty_text: product.qty_text ?? "",
      lab_test_id: null,
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
      cartData?.forEach((element) => {
        if (element.product_id === item.id) {
          isExist = true;
        }
      });
      return isExist;
    } else {
      return false;
    }
  };

  if ((user && cartLoading) || mutation.isPending) return <Loading />;
  return (
    <Box
      cursor={"pointer"}
      padding={5}
      px={3}
      onClick={() => {
        navigate(`/product/${data.title}/${data.id}`);
      }}
    >
      {" "}
      <Box gap={5}>
        {" "}
        <Box align={"center"}>
          {" "}
          <Image
            fallbackSrc="/imagePlaceholder.png"
            w={{ base: "auto", md: "auto" }}
            src={`${imageBaseURL}/${data.image}`}
            h={"80px"}
          />
        </Box>
        <Box mt={2}>
          {" "}
          <Text
            mt={5}
            fontSize={{ base: "sm", md: "md" }}
            fontWeight={500}
            m={0}
            isTruncated
            maxWidth={{ base: "140px", md: "240px" }}
          >
            {data.title}
          </Text>
          <Text
            mt={"2px"}
            fontSize={{
              base: "11px",
              md: "12px",
              lg: "12px",
            }}
            fontWeight={600}
            m={0}
            color={"gray.600"}
            fontFamily={"Quicksand, sans-serif"}
          >
            QTY : {data.qty_text}
          </Text>
          <Flex gap={2} align={"center"}>
            {" "}
            <Text
              textDecor={"line-through"}
              mt={"2px"}
              fontSize={{
                base: "xs",
                md: "sm",
                lg: "sm",
              }}
              m={0}
              color={"primary.text"}
              fontWeight={600}
              fontFamily={"Quicksand, sans-serif"}
            >
              {currency} {data.mrp}
            </Text>
            <Text
              mt={"2px"}
              fontSize={{
                base: "xs",
                md: "sm",
                lg: "sm",
              }}
              m={0}
              color={"primary.text"}
              fontWeight={600}
              fontFamily={"Quicksand, sans-serif"}
            >
              {currency} {data.price}
            </Text>
          </Flex>
          <Button
            colorScheme={"green"}
            size={"xs"}
            w={"full"}
            mt={2}
            onClick={(e) => {
              e.stopPropagation();
              if (!user) {
                return showToast(toast, "error", "Please Login First");
              }

              mutation.mutate(data);
            }}
            leftIcon={
              checkCart(data) ? (
                <BiCheckCircle fontSize={20} style={{ marginRight: "5px" }} />
              ) : (
                <BiRightArrowCircle
                  fontSize={20}
                  style={{ marginRight: "5px" }}
                />
              )
            }
          >
            {checkCart(data) ? "Added To Cart" : "Add to Cart"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Products;
