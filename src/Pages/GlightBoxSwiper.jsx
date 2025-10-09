/* eslint-disable react/prop-types */
import {
  Box,
  Image,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  Modal,
  useDisclosure,
} from "@chakra-ui/react";
import imageBaseURL from "../Controllers/image";
import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function GlightBoxSwiper({ clinic_images }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [initialSlide, setInitialSlide] = useState(0);

  const openLightbox = (index) => {
    setInitialSlide(index);
    onOpen();
  };

  return (
    <Box mt={5}>
      {/* Thumbnail Swiper */}
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={3}
        slidesPerView={4}
        navigation
        pagination={{ clickable: true }}
        breakpoints={{
          480: { slidesPerView: 5, spaceBetween: 3 },
          768: { slidesPerView: 6, spaceBetween: 8 },
          1024: { slidesPerView: 6, spaceBetween: 10 },
        }}
      >
        {clinic_images?.map((image, index) => (
          <SwiperSlide key={index}>
            <Image
              src={`${imageBaseURL}/${image.image}`}
              alt={`Thumbnail ${index + 1}`}
              cursor="pointer"
              onClick={() => openLightbox(index)}
              borderRadius="md"
              boxSize={["70px", "80px"]}
              objectFit="cover"
              transition="all 0.3s ease"
              _hover={{ opacity: 0.8, transform: "scale(1.05)" }}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Lightbox Modal with Swiper */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="5xl"
        closeOnOverlayClick
        isCentered
      >
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="transparent" boxShadow="none" maxW="90vw">
          <ModalCloseButton color="white" zIndex={10} />
          <ModalBody
            p={0}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Box w="full" maxW="1200px" position="relative">
              <Swiper
                modules={[Pagination]}
                spaceBetween={10}
                slidesPerView={1}
                pagination={{ clickable: true }}
                initialSlide={initialSlide}
                loop={true} // Enables wrapping around
              >
                {clinic_images?.map((image, index) => (
                  <SwiperSlide key={index}>
                    <Image
                      src={`${imageBaseURL}/${image.image}`}
                      alt={`Full View ${index + 1}`}
                      maxH="80vh"
                      w="full"
                      objectFit="contain"
                      borderRadius="lg"
                      boxShadow="lg"
                      mx="auto"
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
