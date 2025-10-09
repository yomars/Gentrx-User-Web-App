/* eslint-disable react/prop-types */
import { Box, Flex, Text, Avatar, VStack, HStack } from "@chakra-ui/react";
import { StarIcon } from "@chakra-ui/icons";
import { GET } from "../Controllers/ApiControllers";
import { useQuery } from "@tanstack/react-query";
import Loading from "./Loading";
import ErrorPage from "../Pages/ErrorPage";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import NotAvailable from "./NotAvailable";

const breakpoints = {
  // When window width is >= 320px
  320: {
    slidesPerView: 1,
    spaceBetween: 25,
  },
  // When window width is >= 480px
  480: {
    slidesPerView: 1,
    spaceBetween: 20,
  },
  // When window width is >= 640px
  640: {
    slidesPerView: 1,
    spaceBetween: 20,
  },
  990: {
    slidesPerView: 1,
    spaceBetween: 20,
  },
};

const DoctorReviews = ({ id }) => {
  const getData = async () => {
    const res = await GET(`get_all_doctor_review?doctor_id=${id}`);
    return res.data;
  };

  const { data, isLoading, isError } = useQuery({
    queryFn: getData,
    queryKey: ["doctor-review", id],
  });

  if (isLoading) return <Loading />;
  if (isError) return <ErrorPage />;
  return (
    <>
      <Text fontSize={["md", "lg"]} fontWeight={700} mb={1}>
        Reviews & Ratings -
      </Text>
      {data && data.length ? (
        <Box>
          {/* Reviews Section */}

          <Box mt={1}>
            <Swiper
              modules={[Pagination]}
              spaceBetween={50}
              slidesPerView={5}
              breakpoints={breakpoints}
              loop={true}
              pagination={{ clickable: true }}
              className="reviewSwiper"
            >
              {data?.map((review) => (
                <SwiperSlide
                  key={review.id}
                  style={{ padding: "10px 0", paddingBottom: "40px" }}
                >
                  <Box px={0} minH={"fit-content"}>
                    <Box
                      key={review.id}
                      borderWidth={1}
                      borderRadius="lg"
                      p={4}
                      boxShadow="sm"
                      minH={"100%"}
                    >
                      <Flex align="center" mb={3}>
                        <Avatar
                          name={`${review.f_name} ${review.l_name}`}
                          mr={4}
                        />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">{`${review.f_name} ${review.l_name}`}</Text>
                          <HStack spacing={1}>
                            {[...Array(5)].map((_, i) => (
                              <StarIcon
                                key={i}
                                color={
                                  i < review.points ? "yellow.400" : "gray.300"
                                }
                              />
                            ))}
                          </HStack>
                        </VStack>
                      </Flex>
                      {review.description && (
                        <Text mt={2} color="gray.700">
                          {review.description}
                        </Text>
                      )}
                      <Text mt={2} fontSize="sm" color="gray.500">
                        Reviewed on{" "}
                        {new Date(review.created_at).toLocaleDateString()}
                      </Text>
                    </Box>
                  </Box>
                </SwiperSlide>
              ))}
            </Swiper>
          </Box>
        </Box>
      ) : (
        <NotAvailable text={"Reviews are not available right now."} />
      )}
    </>
  );
};

export default DoctorReviews;
