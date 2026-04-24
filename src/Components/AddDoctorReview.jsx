/* eslint-disable react/prop-types */
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { Rating } from "@smastrom/react-rating";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ADD } from "../Controllers/ApiControllers";
import user from "../Controllers/user";
import showToast from "../Controllers/ShowToast";
const addRating = async (data) => {
  const res = await ADD(user.token, "add_doctor_review", data);
  if (res.response !== 200) {
    throw new Error(res.message);
  }
  return res.data;
};
function AddDoctorReview({ doctID, AppID, isOpen, onClose, patientCode }) {
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      let data = {
        doctor_id: doctID,
        points: rating,
        description: notes,
        patient_code: patientCode,
        appointment_id: AppID,
      };

      await addRating(data);
    },
    onSuccess: () => {
      showToast(toast, "success", "Success");
      queryClient.invalidateQueries(["appointment", AppID]);
      queryClient.invalidateQueries(["doctor", doctID]);
      queryClient.invalidateQueries(["doctors"]);
      onClose();
    },
    onError: (error) => {
      showToast(toast, "error", error.message);
      onClose();
    },
  });
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size={"md"}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader bg={"primary.main"} py={1} color={"#fff"} fontSize={16}>
          Doctor Rating
        </ModalHeader>
        <ModalCloseButton top={"2px"} color={"#fff"} />
        <ModalBody>
          <FormControl mt={4}>
            <FormLabel fontWeight={600}>Rating</FormLabel>
            <Rating
              style={{ maxWidth: 200 }}
              value={rating}
              onChange={setRating}
            />
          </FormControl>
          <FormControl mt={4}>
            <FormLabel fontWeight={600}>Notes</FormLabel>
            <Textarea
              onChange={(e) => {
                setNotes(e.target.value);
              }}
            />
          </FormControl>
        </ModalBody>
        <Divider />
        <ModalFooter pb={2} pt={2}>
          <Button colorScheme="gray" mr={3} onClick={onClose} size={"sm"}>
            Close
          </Button>
          <Button
            colorScheme="green"
            size={"sm"}
            w={48}
            onClick={() => {
              mutation.mutate();
            }}
            isLoading={mutation.isPending}
            isDisabled={mutation.isPending}
          >
            Add
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default AddDoctorReview;
