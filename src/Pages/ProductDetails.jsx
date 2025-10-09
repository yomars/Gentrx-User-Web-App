import {
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  Image,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import { ADD, GET } from "../Controllers/ApiControllers";
import Loading from "../Components/Loading";
import imageBaseURL from "../Controllers/image";
import "swiper/swiper-bundle.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import currency from "../Controllers/currency";
import user from "../Controllers/user";
import showToast from "../Controllers/ShowToast";
import useCartData from "../Hooks/CartData";
import { BiCheckCircle, BiRightArrowCircle } from "react-icons/bi";

function ProductDetails() {
  const { id } = useParams();
  const { cartData } = useCartData();
  const toast = useToast();
  const queryClient = useQueryClient();

  const getData = async () => {
    const res = await GET(`get_product/${id}`);
    return res.data;
  };

  const { isLoading, data } = useQuery({
    queryKey: ["product", id],
    queryFn: getData,
  });

  const offPercent = (price, mrp) => {
    if (mrp === 0) return 0; // Avoid division by zero
    const discountPercentage = ((mrp - price) / mrp) * 100;
    return discountPercentage.toFixed(2);
  };

  // check item in added in the cart
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

  // add cart
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

  if (isLoading || mutation.isPending) return <Loading />;

  return (
    <Box className="container" mt={5}>
      <Flex gap={{ base: 5, md: "10" }} flexDir={{ base: "column", md: "row" }}>
        <Box
          maxW={"100%"}
          bg={"#fff"}
          p={2}
          borderRadius={10}
          boxShadow={"2px 2px 20px 0 rgb(82 66 47 / 12%)"}
          overflow={"hidden"}
          flex={2}
        >
          <Flex
            gap={{ base: "2", md: "10" }}
            flexDir={{ base: "column", md: "row" }}
            align={"start"}
          >
            <Box w={{ base: "100%", md: "40%" }} flex={1} p={3}>
              <Swiper
                className="productSwiper"
                spaceBetween={30}
                centeredSlides={true}
                autoplay={{
                  delay: 3000,
                  disableOnInteraction: false,
                }}
                pagination={{
                  clickable: true,
                }}
                speed={1200}
                modules={[Autoplay, Pagination, Navigation]}
                style={{
                  cursor: "pointer",
                  overflow: "hidden",
                  maxWidth: "100%",
                }}
              >
                {[
                  `${imageBaseURL}/${data?.image}`,
                  `${imageBaseURL}/${data?.image}`,
                  `${imageBaseURL}/${data?.image}`,
                ].map((item, index) => (
                  <SwiperSlide key={index}>
                    {" "}
                    <Flex justify={"center"}>
                      {" "}
                      <Image
                        key={index}
                        w={1}
                        src={item}
                        width={300}
                        maxW={"80vw"}
                        fallbackSrc="/imagePlaceholder.png"
                      />
                    </Flex>
                  </SwiperSlide>
                ))}
              </Swiper>
            </Box>
            <Divider my={2} display={{ base: "block", md: "none" }} />
            <Box w={"100%"} flex={1} mt={{ base: "0", md: 4 }}>
              <Text fontSize={"sm"} fontWeight={600} color={"gray.600"}>
                {data.cat_title}
              </Text>
              <Heading fontSize={"lg"}>{data.title}</Heading>
              <Flex gap={2}>
                {" "}
                <Text fontSize={"md"} fontWeight={600} color={"gray.600"}>
                  Price {currency} {data.price}
                </Text>{" "}
                <Text
                  fontSize={"md"}
                  fontWeight={600}
                  color={"gray.600"}
                  textDecor={"line-through"}
                >
                  {currency} {data.mrp}
                </Text>
                <Text fontSize={"md"} fontWeight={600} color={"green.500"}>
                  {offPercent(data.price, data.mrp)} % Off
                </Text>
              </Flex>{" "}
              <Text fontSize={"xs"} fontWeight={600} color={"green.500"}>
                {data.offer_text}
              </Text>
              <Divider my={2} />
              <Text fontSize={"lg"} fontWeight={600} color={"gray.800"}>
                Description
              </Text>
              <Text fontSize={"sm"} fontWeight={500} color={"gray.600"}>
                {data.description}
              </Text>
              <Text fontSize={"lg"} fontWeight={600} color={"gray.800"} mt={3}>
                Disclaimer
              </Text>
              <Text fontSize={"sm"} fontWeight={500} color={"gray.600"}>
                {data.disclaimer}
              </Text>
              <Button
                size={"sm"}
                w={"100%"}
                mt={3}
                colorScheme={"green"}
                leftIcon={
                  checkCart(data) ? (
                    <BiCheckCircle
                      fontSize={20}
                      style={{ marginRight: "5px" }}
                    />
                  ) : (
                    <BiRightArrowCircle
                      fontSize={20}
                      style={{ marginRight: "5px" }}
                    />
                  )
                }
                onClick={() => {
                  if (!user) {
                    return showToast(toast, "error", "Please Login First");
                  }
                  mutation.mutate(data);
                }}
              >
                {checkCart(data) ? "Added To Cart" : "Add to Cart"}
              </Button>
            </Box>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}

export default ProductDetails;
