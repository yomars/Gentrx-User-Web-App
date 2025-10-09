import { BsStar } from "react-icons/bs";
import { BsStarFill } from "react-icons/bs";
import { BsStarHalf } from "react-icons/bs";
import PropTypes from "prop-types";
import { Flex } from "@chakra-ui/react";

const RatingStars = ({ rating }) => {
  const MAX_STARS = 5;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = MAX_STARS - fullStars - (hasHalfStar ? 1 : 0);

  const stars = [];

  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(<BsStarFill key={`full-${i}`} color="#FAA300" fontSize={13} />);
  }

  // Add half star if needed
  if (hasHalfStar) {
    stars.push(<BsStarHalf key="half" color="#FAA300" fontSize={13} />);
  }

  // Add empty stars
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<BsStar key={`empty-${i}`} color="#b6b6b6" fontSize={13} />);
  }

  return <Flex gap={1}>{stars}</Flex>;
};

RatingStars.propTypes = {
  rating: PropTypes.number.isRequired,
};

export default RatingStars;
