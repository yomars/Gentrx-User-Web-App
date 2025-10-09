/* eslint-disable react/prop-types */
import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import { Box, Heading, HStack, Image, Skeleton, Text } from "@chakra-ui/react";
import imageBaseURL from "../Controllers/image";
import RatingStars from "../Hooks/RatingStars";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";

const getData = async () => {
  const res = await GET("get_testimonial");
  if (res.response !== 200) {
    throw new Error(res.message);
  }

  return res.data;
};

function Testimonials() {
  const { data, isLoading, error } = useQuery({
    queryKey: "testimonials",
    queryFn: getData,
  });

  const breakpoints = {
    // When window width is >= 320px
    320: {
      slidesPerView: 1,
      spaceBetween: 25,
    },
    // When window width is >= 480px
    480: {
      slidesPerView: 2,
      spaceBetween: 20,
    },
    // When window width is >= 640px
    640: {
      slidesPerView: 2,
      spaceBetween: 20,
    },
    990: {
      slidesPerView: 3,
      spaceBetween: 20,
    },
  };

  return (
    <Box mt={5} className="container">
      {data ? (
        <>
          <Heading color={"primary.text"} fontWeight={600} textAlign={"center"}>
            Testimonials
          </Heading>
          <Text
            fontSize={14}
            textAlign={"center"}
            mt={2}
            color={"gray.500"}
            fontWeight={500}
          >
            Experience the ease of finding everything you need under one roof
            with our comprehensive departmental offerings.
          </Text>
          <Box mt={4}>
            <Swiper
              modules={[Pagination]}
              spaceBetween={50}
              slidesPerView={5}
              breakpoints={breakpoints}
              loop={true}
              pagination={{ clickable: true }}
              
            >
              {data?.map((item) => (
                <SwiperSlide key={item.id} style={{ padding: "40px 0" }}>
                  <Box px={3}>
                    <TestimonialCard item={item} />
                  </Box>
                </SwiperSlide>
              ))}
            </Swiper>
          </Box>
        </>
      ) : null}
      {isLoading ? (
        <>
          {" "}
          <Skeleton h={"100px"} w={"100%"} mt={5} />
        </>
      ) : null}
      {error ? (
        <>
          {" "}
          <Text
            fontSize={{ base: 12, md: 14 }}
            fontWeight={400}
            color={"red"}
            textAlign={"center"}
          >
            Something Went wrong!
          </Text>
          <Text
            fontSize={{ base: 12, md: 14 }}
            fontWeight={400}
            color={"red"}
            textAlign={"center"}
          >
            Can&apos;t Fetch Departments!
          </Text>
        </>
      ) : null}
    </Box>
  );
}

export default Testimonials;

const TestimonialCard = ({ item }) => {
  const { title, sub_title, image, rating, description } = item;
  return (
    <Box p={4} borderRadius="md" boxShadow="md" bg="white" maxW="sm" mx="auto">
      <Image
        borderRadius="full"
        boxSize="100px"
        src={`${imageBaseURL}/${image}`}
        fallbackSrc="user.png"
        alt={title}
        mx="auto"
        mb={4}
      />
      <Text fontWeight="bold" fontSize="xl" mb={0} textAlign="center">
        {title}
      </Text>
      <Text fontSize="md" color="gray.600" mb={0} textAlign="center">
        {sub_title}
      </Text>
      <HStack justifyContent="center" mb={4}>
        <RatingStars rating={rating} />
      </HStack>
      <Text textAlign="center" color="gray.500">
        {description}
      </Text>
    </Box>
  );
};
