// File: showToast.js
const showToast = (toast, variant, message) => {
  toast({
    title: message,
    status: variant, // success, error, warning, info
    duration: 2000, // Duration in milliseconds
    isClosable: true,
    position: "top",
  });
};

export default showToast;
