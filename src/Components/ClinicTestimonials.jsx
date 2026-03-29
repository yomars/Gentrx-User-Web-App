/* eslint-disable react/prop-types */
import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import {
    Box,
    Flex, HStack,
    Image,
    Skeleton,
    Text
} from "@chakra-ui/react";
import imageBaseURL from "../Controllers/image";
import RatingStars from "../Hooks/RatingStars";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";

const getData = async (clinicID) => {
  const res = await GET(`get_testimonial?clinic_id=${clinicID}`);
  if (res.response !== 200) {
    throw new Error(res.message);
  }

  return res.data;
};

function ClinicTestimonials({ clinicId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["clinic-testimonials", clinicId],
    queryFn: () => getData(clinicId),
  });
  const testimonials = Array.isArray(data) ? data : [];
  return (
    <Box mt={5}>
      {data ? (
        <>
          <Box mt={4}>
            <Swiper
              modules={[Pagination]}
              spaceBetween={50}
              slidesPerView={1}
              loop={testimonials.length > 1}
              pagination={{ clickable: true }}
            >
              {testimonials.map((item) => (
                <SwiperSlide key={item.id} style={{ padding: "20px 0" }}>
                  <Box px={2}>
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

const TestimonialCard = ({ item }) => {
  const { title, sub_title, image, rating, description } = item;
  return (
    <Box
      p={4}
      borderRadius="md"
      boxShadow="md"
      bg="gray.50"
      maxW="sm"
      mx="auto"
    >
      <Flex align={"center"} gap={5} mb={2}>
        {" "}
        <Image
          borderRadius="sm"
          boxSize="100px"
          src={`${imageBaseURL}/${image}`}
          fallbackSrc="/user.png"
          alt={title}
          mb={4}
        />
        <Box>
          <Text fontWeight="bold" fontSize="xl" mb={0}>
            {title}
          </Text>
          <Text fontSize="md" color="gray.600" mb={0}>
            {sub_title}
          </Text>
          <HStack justifyContent="start" mb={4}>
            <RatingStars rating={rating} />
          </HStack>
        </Box>
      </Flex>
      <Text textAlign="justify" color="gray.500" fontSize={"sm"}>
        {description}
      </Text>
    </Box>
  );
};
export default ClinicTestimonials;
