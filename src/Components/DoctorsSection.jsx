/**
 * DoctorsSection.jsx
 *
 * Premium doctor card grid with hover-reveal overlay.
 * Interaction pattern inspired by aderdent.com/ekibimiz/.
 *
 * Layout:
 *   Desktop  – 3-column CSS Grid, hover lifts card and slides up an overlay
 *   Tablet   – 2-column grid
 *   Mobile   – 1-column, tap toggles the overlay (via JS class toggle)
 *
 * Dependencies: Chakra UI, react-router-dom, @tanstack/react-query
 */

import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import { Box, Button, Flex, Heading, Skeleton, Text } from "@chakra-ui/react";
import imageBaseURL from "./../Controllers/image";
import { Link, useNavigate } from "react-router-dom";
import NotAvailable from "./NotAvailable";
import { useCity } from "../Context/SelectedCity";
import "./DoctorsSection.css";

/* ─────────────────────────────────────────────
   Single card component
───────────────────────────────────────────── */
function DoctorCard({ doctor }) {
  const navigate = useNavigate();

  const imageSrc = doctor.image
    ? `${imageBaseURL}/${doctor.image}`
    : "/doctor-2.png";

  /* Mobile: toggle active class on tap */
  const handleTap = (e) => {
    const card = e.currentTarget;
    const isMobile = window.matchMedia("(hover: none)").matches;
    if (isMobile) {
      e.preventDefault();
      card.classList.toggle("ds-card--active");
    }
  };

  return (
    <article
      className="ds-card"
      onClick={handleTap}
      aria-label={`${doctor.f_name} ${doctor.l_name} – ${doctor.specialization}`}
    >
      {/* ── Portrait image ── */}
      <div className="ds-card__img-wrap">
        <img
          className="ds-card__img"
          src={imageSrc}
          alt={`Dr. ${doctor.f_name} ${doctor.l_name}`}
        />
      </div>

      {/* ── Default nameplate (always visible) ── */}
      <div className="ds-card__nameplate">
        <p className="ds-card__name">
          {doctor.f_name} {doctor.l_name}
        </p>
        <p className="ds-card__spec">{doctor.specialization}</p>
      </div>

      {/* ── Hover / tap overlay ── */}
      <div className="ds-card__overlay" aria-hidden="true">
        <div className="ds-card__overlay-inner">
          <p className="ds-card__overlay-name">
            {doctor.f_name} {doctor.l_name}
          </p>
          <p className="ds-card__overlay-spec">{doctor.specialization}</p>

          {doctor.ex_year ? (
            <p className="ds-card__overlay-exp">
              {doctor.ex_year}+ years experience
            </p>
          ) : null}

          {doctor.clinic_title ? (
            <p className="ds-card__overlay-clinic">{doctor.clinic_title}</p>
          ) : null}

          <button
            className="ds-card__cta"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/doctor/${doctor.user_id}`);
            }}
          >
            Book Appointment
          </button>
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────
   Section wrapper (handles data fetching)
───────────────────────────────────────────── */
export default function DoctorsSection() {
  const { selectedCity } = useCity();

  const getData = async () => {
    const url = selectedCity
      ? `get_doctor?active=1&city_id=${selectedCity.id}`
      : `get_doctor?active=1`;
    const res = await GET(url);
    return res.data.length > 6 ? res.data.slice(0, 6) : res.data;
  };

  const { isLoading, data, error } = useQuery({
    queryKey: ["doctors-section", selectedCity],
    queryFn: getData,
  });

  return (
    <Box as="section" mt={10} className="container ds-section">
      {/* ── Section header ── */}
      <Heading
        color="primary.text"
        fontWeight={700}
        textAlign="center"
        fontSize={{ base: "22px", md: "28px" }}
      >
        {selectedCity
          ? `Best Doctors in ${selectedCity.city}`
          : "Meet Our Doctors"}
      </Heading>
      <Text
        fontSize={14}
        textAlign="center"
        mt={2}
        mb={8}
        color="gray.500"
        fontWeight={500}
        maxW="540px"
        mx="auto"
      >
        Our team of expert doctors spans a wide range of specialties, ensuring
        you receive the highest quality care tailored to your needs.
      </Text>

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <Flex gap={6} flexWrap="wrap" justify="center">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} h="380px" w="300px" borderRadius="16px" />
          ))}
        </Flex>
      )}

      {/* ── Error state ── */}
      {error && (
        <Text color="red.500" textAlign="center" fontSize={14}>
          Could not load doctors. Please try again.
        </Text>
      )}

      {/* ── Card grid ── */}
      {data && data.length > 0 && (
        <>
          <div className="ds-grid">
            {data.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>

          <Flex justify="center" mt={10}>
            <Button
              as={Link}
              to="/doctors"
              size="md"
              fontWeight={600}
              colorScheme="green"
              w={{ base: "100%", sm: "280px" }}
              borderRadius="full"
            >
              See All Doctors →
            </Button>
          </Flex>
        </>
      )}

      {/* ── Empty state ── */}
      {data && data.length === 0 && <NotAvailable name="Doctors" />}
    </Box>
  );
}
