/* eslint-disable react/no-children-prop */
import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import {
  Box,
  Button,
  Flex,
  Skeleton,
  Text,
  InputGroup,
  InputLeftElement,
  Input,
} from "@chakra-ui/react";
import imageBaseURL from "./../Controllers/image";
import Loading from "../Components/Loading";
import RatingStars from "../Hooks/RatingStars";
import {
  FaInstagram,
  FaFacebook,
  FaTwitter,
  FaYoutube,
  FaUserAlt,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import ErrorPage from "./ErrorPage";
import { SearchIcon } from "@chakra-ui/icons";
import { useCity } from "../Context/SelectedCity";
import { BsHospitalFill } from "react-icons/bs";
import { ImLocation } from "react-icons/im";
import NotAvailable from "../Components/NotAvailable";
import LocationSeletor from "../Components/LocationSeletor";
import useSearchFilter from "../Hooks/UseSearchFilter";
import "../Components/DoctorsSection.css";
import { buildDoctorEndpoint } from "../lib/doctorQuery";

export default function Doctors() {
  const { selectedCity } = useCity();
  const navigate = useNavigate();

  const getData = async () => {
    const endpoint = await buildDoctorEndpoint({ selectedCity });
    const res = await GET(endpoint);
    return res.data;
  };
  const { isLoading, data, error } = useQuery({
    queryKey: ["Doctors", selectedCity],
    queryFn: getData,
  });

  const { handleSearchChange, searchTerm, filteredData } =
    useSearchFilter(data);

  if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;

  return (
    <Box>
      <Box
        bg="#eafaf7"
        p={4}
        py={{ base: "4", md: "20" }}
        border="1px solid"
        borderColor="#d6f1eb"
      >
        <Box className="container">
          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 32, md: 48 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#1d8f7a"}
          >
            Our Doctors
          </Text>
          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 22, md: 32 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#4f6787"}
          >
            Explore a Multifaceted Team of <br />
            <Text as={"span"} color={"green.text"} fontWeight={800}>
              Healthcare Specialists
            </Text>
          </Text>
        </Box>
      </Box>
      <Box
        mt={{ base: 0, md: 0 }}
        className="container"
        pt={5}
        position={"relative"}
      >
        <Text
          fontSize={16}
          textAlign={"center"}
          mt={2}
          color={"gray.500"}
          fontWeight={500}
        >
          Experience the ease of finding the right medical <br /> expert for
          your needs with our comprehensive selection of doctors.
        </Text>
        <Flex
          justifyContent={"center"}
          w={"100%"}
          flexDir={{ base: "column", md: "row" }}
          gap={{ base: 4, md: 0 }}
          mt={5}
        >
          {" "}
          <LocationSeletor type="search" />
          <InputGroup mb={4} maxW={"fit-content"} borderLeftRadius={0}>
            <InputLeftElement children={<SearchIcon />} />
            <Input
              placeholder="Search doctors..."
              aria-label="Search doctors"
              variant="outline"
              w={500}
              maxW={"100vw"}
              bg={"#fff"}
              borderLeftRadius={{ base: 6, md: 0 }}
              onChange={(e) => {
                handleSearchChange(e.target.value);
              }}
              value={searchTerm}
            />
          </InputGroup>
        </Flex>

        {filteredData ? (
          <>
            {" "}
            <Box>
              <Box mt={4}>
                {filteredData?.length ? (
                  <div className="ds-grid ds-grid--wide">
                    {filteredData.map((item, idx) => {
                      const imageSrc = item.image
                        ? `${imageBaseURL}/${item.image}`
                        : "https://plus.unsplash.com/premium_photo-1661764878654-3d0fc2eefcca?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGRvY3RvcnxlbnwwfHwwfHx8MA%3D%3D";
                      return (
                        <article
                          key={item.id}
                          className="ds-card ds-card--compact"
                          aria-label={`Dr. ${item.f_name} ${item.l_name} - ${item.specialization}`}
                          onClick={(e) => {
                            const isMobile = window.matchMedia(
                              "(hover: none)"
                            ).matches;
                            if (isMobile) {
                              e.preventDefault();
                              e.currentTarget.classList.toggle(
                                "ds-card--active"
                              );
                            } else {
                              navigate(`/doctor/${item.user_id}`);
                            }
                          }}
                        >
                          {/* Portrait image — links to doctor profile */}
                          <Link
                            to={`/doctor/${item.user_id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: "block" }}
                          >
                            <div className="ds-card__img-wrap">
                              <img
                                className="ds-card__img"
                                src={imageSrc}
                                alt={`Dr. ${item.f_name} ${item.l_name}`}
                              />
                            </div>
                          </Link>

                          {/* Always-visible nameplate: name + spec only */}
                          <div className="ds-card__nameplate">
                            <p className="ds-card__name">
                              Dr. {item.f_name} {item.l_name}
                            </p>
                            <p className="ds-card__spec">
                              {item.department_name} &bull; {item.specialization}
                            </p>
                          </div>

                          {/* Hover overlay covers entire card — slides up on hover */}
                          <div className="ds-card__overlay" aria-hidden="true">
                            <div className="ds-card__overlay-inner">
                              <p className="ds-card__overlay-name">
                                Dr. {item.f_name} {item.l_name}
                              </p>
                              <p className="ds-card__overlay-spec">
                                {item.specialization}
                              </p>

                              {/* Rating */}
                              <span className="ds-card__overlay-rating">
                                <RatingStars rating={item.average_rating} />
                                <span>
                                  {parseFloat(item.average_rating).toFixed(1)} ({item.number_of_reviews})
                                </span>
                              </span>

                              {item.ex_year ? (
                                <p className="ds-card__overlay-exp">
                                  {item.ex_year}+ years experience
                                </p>
                              ) : null}

                              {item.clinic_title ? (
                                <p className="ds-card__overlay-clinic">
                                  <BsHospitalFill style={{ display: "inline", marginRight: 4 }} />
                                  {item.clinic_title}
                                </p>
                              ) : null}

                              {item.clinics_address ? (
                                <p className="ds-card__overlay-clinic">
                                  <ImLocation style={{ display: "inline", marginRight: 4 }} />
                                  {item.clinics_address}
                                </p>
                              ) : null}

                              <p className="ds-card__overlay-exp">
                                <FaUserAlt style={{ display: "inline", marginRight: 4 }} />
                                {item.total_appointment_done} Appointments Done
                              </p>

                              {item?.stop_booking === 1 && (
                                <p className="ds-card__overlay-stop">
                                  Currently Not Accepting Appointments
                                </p>
                              )}

                              {/* Social links */}
                              <div className="ds-card__overlay-social">
                                {item.insta_link && (
                                  <a href={item.insta_link} target="_blank" rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()} aria-label="Instagram">
                                    <FaInstagram />
                                  </a>
                                )}
                                {item.fb_linik && (
                                  <a href={item.fb_linik} target="_blank" rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()} aria-label="Facebook">
                                    <FaFacebook />
                                  </a>
                                )}
                                {item.twitter_link && (
                                  <a href={item.twitter_link} target="_blank" rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()} aria-label="Twitter">
                                    <FaTwitter />
                                  </a>
                                )}
                                {item.you_tube_link && (
                                  <a href={item.you_tube_link} target="_blank" rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()} aria-label="YouTube">
                                    <FaYoutube />
                                  </a>
                                )}
                              </div>

                              <button
                                className="ds-card__cta"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/doctor/${item.user_id}`);
                                }}
                              >
                                Book Appointment
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <Box mt={6}>
                    <NotAvailable
                      name={"Doctors"}
                      text={`No doctors are currently listed for ${selectedCity?.city || "this location"}. Try another city or browse partner clinics while availability updates.`}
                    />
                    <Flex justify="center" gap={3} mt={4} wrap="wrap">
                      <Button
                        as={Link}
                        to="/clinics"
                        colorScheme="blue"
                        size="sm"
                      >
                        Browse Clinics
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearchChange("")}
                      >
                        Clear Search
                      </Button>
                    </Flex>
                  </Box>
                )}
              </Box>
            </Box>
          </>
        ) : (
          <NotAvailable name={"Doctors"} />
        )}
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
              Cant Fetch Doctors!
            </Text>
          </>
        ) : null}
      </Box>
    </Box>
  );
}